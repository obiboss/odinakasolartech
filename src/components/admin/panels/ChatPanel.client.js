// src/components/admin/panels/ChatPanel.client.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function ChatPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const bottomRef = useRef(null);

  const active = useMemo(
    () => convos.find((c) => c.id === activeId) || null,
    [activeId, convos],
  );

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,customer_id,status,created_at")
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);

    setConvos(data || []);
    if (!activeId && (data || []).length) setActiveId(data[0].id);
  }

  async function loadMessages(conversationId) {
    const { data, error } = await supabase
      .from("messages")
      .select("id,conversation_id,sender,content,attachment_url,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return setErr(error.message);

    setMessages(data || []);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      await loadConversations();
      setLoading(false);
    })();
    // realtime: conversations inserts/updates
    const ch = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;

    loadMessages(activeId);

    // realtime: messages for active convo
    const ch = supabase
      .channel(`admin-messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            50,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId]);

  async function send() {
    if (!activeId) return;
    const content = text.trim();
    if (!content) return;

    setSending(true);
    setErr("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender: "admin",
      content,
    });

    setSending(false);
    if (error) return setErr(error.message);
    setText("");
  }

  async function uploadChatFile(file) {
    if (!activeId) return;

    setSending(true);
    setErr("");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `chat/${activeId}/${crypto.randomUUID()}.${ext}`;

    const up = await supabase.storage.from("chat-uploads").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (up.error) {
      setSending(false);
      return setErr(up.error.message);
    }

    const { data } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    const url = data?.publicUrl;

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender: "admin",
      content: "File uploaded",
      attachment_url: url,
    });

    setSending(false);
    if (error) return setErr(error.message);
  }

  async function setStatus(status) {
    if (!activeId) return;
    const { error } = await supabase
      .from("conversations")
      .update({ status })
      .eq("id", activeId);
    if (error) return setErr(error.message);
    await loadConversations();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      <h3 className="text-lg font-bold">Chat</h3>
      <p className="mt-1 text-sm text-slate-600">
        Handle multiple chats in one place.
      </p>

      {err && (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
        {/* conversations */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-sm font-semibold">Conversations</div>
              <button
                onClick={loadConversations}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="px-2 py-3 text-sm text-slate-600">Loading…</div>
            ) : convos.length === 0 ? (
              <div className="px-2 py-3 text-sm text-slate-600">
                No conversations yet.
              </div>
            ) : (
              <div className="mt-2 grid gap-2">
                {convos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cx(
                      "w-full text-left rounded-2xl border px-3 py-3 transition",
                      c.id === activeId
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        {c.customer_id || "Customer"}
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                        {c.status || "open"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* messages */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {active ? `Chat: ${active.customer_id}` : "Select a chat"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Status: {active?.status || "—"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatus("open")}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold hover:bg-white/[0.09]"
                >
                  Mark open
                </button>
                <button
                  onClick={() => setStatus("closed")}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold hover:bg-white/[0.09]"
                >
                  Mark closed
                </button>
              </div>
            </div>

            <div className="mt-4 h-[380px] overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
              {activeId ? (
                messages.length === 0 ? (
                  <div className="text-sm text-slate-600">No messages yet.</div>
                ) : (
                  <div className="grid gap-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cx(
                          "max-w-[92%] rounded-2xl border px-3 py-2 text-sm",
                          m.sender === "admin"
                            ? "ml-auto border-amber-500/20 bg-amber-500/10"
                            : "mr-auto border-slate-200 bg-slate-50",
                        )}
                      >
                        <div className="text-xs text-slate-500">
                          {m.sender} •{" "}
                          {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                        <div className="mt-1 text-slate-900">{m.content}</div>
                        {m.attachment_url ? (
                          <a
                            className="mt-2 inline-block text-xs font-semibold text-amber-600 underline"
                            href={m.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open attachment
                          </a>
                        ) : null}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-600">
                  Select a conversation to view messages.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a reply…"
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />

              <div className="flex gap-2">
                <label className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold hover:bg-slate-100">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!activeId || sending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadChatFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  onClick={send}
                  disabled={!activeId || sending}
                  className={cx(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    "bg-white text-black hover:opacity-95 disabled:opacity-60",
                  )}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Note: Customers will upload payment proof inside the customer
              chat. You will see it here as an attachment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
