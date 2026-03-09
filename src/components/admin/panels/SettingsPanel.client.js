// src/components/admin/panels/SettingsPanel.client.js
"use client";

export default function SettingsPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <h3 className="text-lg font-bold">Settings</h3>
      <p className="mt-1 text-sm text-white/70">
        Next: business profile, bank details, theme toggle, analytics switches.
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/80">
        <div className="font-semibold">Planned (next)</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-white/70 space-y-1">
          <li>Bank transfer details (account name, number, bank)</li>
          <li>Pay-on-delivery notes and delivery regions</li>
          <li>Theme default: light (site) + toggle</li>
          <li>Analytics: views, searches, orders</li>
        </ul>
      </div>
    </div>
  );
}
