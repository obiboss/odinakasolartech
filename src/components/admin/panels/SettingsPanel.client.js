"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const EMPTY_FORM = {
  bank_name: "",
  account_name: "",
  account_number: "",
  instructions: "",
  is_active: true,
};

export default function SettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [rowId, setRowId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setErr("");
      setSuccess("");

      const { data, error } = await supabase
        .from("payment_settings")
        .select(
          "id, bank_name, account_name, account_number, instructions, is_active, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setRowId(null);
        setForm(EMPTY_FORM);
        return;
      }

      setRowId(data.id);
      setForm({
        bank_name: data.bank_name ?? "",
        account_name: data.account_name ?? "",
        account_number: data.account_number ?? "",
        instructions: data.instructions ?? "",
        is_active: Boolean(data.is_active),
      });
    } catch (e) {
      setErr(e?.message || "Failed to load payment settings.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErr("");
    setSuccess("");

    if (!form.bank_name.trim()) {
      setErr("Bank name is required.");
      return;
    }

    if (!form.account_name.trim()) {
      setErr("Account name is required.");
      return;
    }

    if (!form.account_number.trim()) {
      setErr("Account number is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        bank_name: form.bank_name.trim(),
        account_name: form.account_name.trim(),
        account_number: form.account_number.trim(),
        instructions: form.instructions.trim() || null,
        is_active: true,
      };

      if (rowId) {
        const { data, error } = await supabase
          .from("payment_settings")
          .update(payload)
          .eq("id", rowId)
          .select("id")
          .single();

        if (error) throw error;
        setRowId(data.id);
      } else {
        const { data, error } = await supabase
          .from("payment_settings")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        setRowId(data.id);
      }

      setSuccess("Bank details updated successfully.");
      await loadSettings();
    } catch (e) {
      setErr(e?.message || "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (!confirmPassword) {
      setPasswordError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setPasswordBusy(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError(e?.message || "Failed to update password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      <h3 className="text-lg font-bold">Settings</h3>
      <p className="mt-1 text-sm text-slate-600">
        Manage payment details used for deposit confirmation in customer chat.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-900">
            Bank transfer details
          </div>
          <div className="mt-1 text-sm text-slate-600">
            These details appear automatically when a customer order requires a
            deposit.
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {err ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {err}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Bank name
                </label>
                <input
                  value={form.bank_name}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="e.g. GTBank"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Account name
                </label>
                <input
                  value={form.account_name}
                  onChange={(e) => updateField("account_name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="e.g. Odinakachukwu Solar Tech"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Account number
                </label>
                <input
                  value={form.account_number}
                  onChange={(e) =>
                    updateField("account_number", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="Enter account number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Customer instruction
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder='e.g. After payment, click "I have paid" and upload your receipt in chat.'
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                This active bank account will be shown to customers for deposit
                payments.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save bank details"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <div className="text-sm font-semibold text-slate-900">
            Change admin password
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Update the password for the currently signed-in admin account.
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {passwordError}
            </div>
          ) : null}

          {passwordSuccess ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {passwordSuccess}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Use a strong password you can securely hand over to the client or
              let the client change after sign-in.
            </div>

            <button
              type="submit"
              disabled={passwordBusy}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {passwordBusy ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
