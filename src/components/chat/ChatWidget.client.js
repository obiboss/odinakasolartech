// src/components/chat/ChatWidget.client.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) return data.session;

  // If you enabled Anonymous sign-ins in Supabase Auth settings:
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}

async function getOrCreateConversation(userId) {
  // find latest open conversation for this user
  const { data: existing, error: selErr } = await supabase
    .from("conversations")
    .select("id,status,created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) throw selErr;

  if (existing?.[0]?.id) return existing[0].id;

  const { data: created, error: insErr } = await supabase
    .from("conversations")
    .insert({
      customer_id: userId,
      status: "open",
      order_id: null,
    })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return created.id;
}

async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender, content, attachment_url, attachment_type, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function uploadChatFile({ conversationId, file }) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${conversationId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("chat-uploads")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) throw upErr;

  // Store as bucket+path (so we can sign it when rendering)
  return { bucket: "chat-uploads", path };
}

async function getSignedUrl(bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 30); // 30 mins

  if (error) throw error;
  return data.signedUrl;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [signedMap, setSignedMap] = useState({}); // key: bucket/path -> signedUrl
  const bottomRef = useRef(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  const canSend = useMemo(() => {
    return !busy && (text.trim().length > 0 || !!file) && !!conversationId;
  }, [busy, text, file, conversationId]);

  useEffect(() => {
    function setInitialPosition() {
      const size = 56;
      const margin = 24;
      const x = Math.max(margin, window.innerWidth - size - margin);
      const y = Math.max(margin, window.innerHeight - size - margin);
      setPosition({ x, y });
    }

    setInitialPosition();
    window.addEventListener("resize", setInitialPosition);
    return () => window.removeEventListener("resize", setInitialPosition);
  }, []);

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function handlePointerDown(e) {
    if (!buttonRef.current) return;
    draggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { ...position };
    buttonRef.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!buttonRef.current) return;
    if (e.pressure === 0) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.hypot(dx, dy);

    const dragThreshold = 5;
    const isDraggingNow = distance > dragThreshold;

    if (isDraggingNow) {
      const nextX = startPosRef.current.x + dx;
      const nextY = startPosRef.current.y + dy;

      const size = 56;
      const margin = 24;
      const maxX = window.innerWidth - size - margin;
      const maxY = window.innerHeight - size - margin;

      setPosition({
        x: clamp(nextX, margin, maxX),
        y: clamp(nextY, margin, maxY),
      });
    }

    draggingRef.current = isDraggingNow;
    setIsDragging(isDraggingNow);
  }

  function handlePointerUp(e) {
    if (!buttonRef.current) return;
    buttonRef.current.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    setIsDragging(false);
  }

  function handleButtonClick() {
    if (draggingRef.current) return;
    setOpen((v) => !v);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setBusy(true);
        const session = await ensureSession();
        if (!alive) return;

        const cid = await getOrCreateConversation(session.user.id);
        if (!alive) return;

        setConversationId(cid);

        const initial = await fetchMessages(cid);
        if (!alive) return;

        setMessages(initial);
      } catch (e) {
        setBootError(e?.message || "Chat failed to start.");
      } finally {
        setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // sign attachment urls lazily
  useEffect(() => {
    let alive = true;

    (async () => {
      const need = messages
        .filter((m) => m.attachment_url)
        .map((m) => m.attachment_url)
        .filter((u) => !signedMap[u]);

      if (need.length === 0) return;

      const next = { ...signedMap };
      for (const key of need) {
        try {
          const [bucket, ...rest] = key.split("/");
          const path = rest.join("/");
          const url = await getSignedUrl(bucket, path);
          next[key] = url;
        } catch {
          // ignore; keep missing
        }
      }
      if (!alive) return;
      setSignedMap(next);
    })();

    return () => {
      alive = false;
    };
  }, [messages, signedMap]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!canSend) return;

    setBusy(true);
    try {
      let attachment_url = null;
      let attachment_type = null;

      if (file) {
        const uploaded = await uploadChatFile({ conversationId, file });
        attachment_url = `${uploaded.bucket}/${uploaded.path}`; // store bucket/path
        attachment_type = file.type || "application/octet-stream";
      }

      const content = text.trim();

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender: "customer",
        content: content || (attachment_url ? "" : ""),
        attachment_url,
        attachment_type,
      });

      if (error) throw error;

      setText("");
      setFile(null);
    } catch (e2) {
      alert(e2?.message || "Failed to send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* launcher */}
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleButtonClick}
        aria-label="Open chat support"
        style={{
          left: position.x,
          top: position.y,
        }}
        className={cx(
          "fixed z-[80] rounded-full bg-[#F5A200] shadow-[0_14px_40px_rgba(0,0,0,0.28)]",
          "h-14 w-14 flex items-center justify-center transition-transform duration-200",
          "hover:scale-105",
          "cursor-pointer",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>

      {/* panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[80] w-[92vw] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white/90 text-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold">Support Chat</div>
              <div className="text-[11px] text-slate-500">
                Reply time depends on availability
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold hover:bg-slate-200"
            >
              Close
            </button>
          </div>

          <div className="max-h-[52vh] overflow-auto px-3 py-3">
            {bootError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {bootError}
              </div>
            ) : null}

            {messages.length === 0 && !bootError ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Ask a question or upload payment proof.
              </div>
            ) : null}

            <div className="mt-2 space-y-2">
              {messages.map((m) => {
                const isMe = m.sender === "customer";
                const key = m.attachment_url || "";
                const signed = key ? signedMap[key] : "";

                return (
                  <div
                    key={m.id}
                    className={cx(
                      "flex",
                      isMe ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cx(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        isMe
                          ? "bg-yellow-500 text-black"
                          : "bg-slate-50 text-slate-700",
                      )}
                    >
                      {m.content ? <div>{m.content}</div> : null}

                      {m.attachment_url ? (
                        <div className={cx(m.content ? "mt-2" : "")}>
                          {signed ? (
                            <a
                              className={cx(
                                "underline text-xs",
                                isMe ? "text-black/80" : "text-slate-600",
                              )}
                              href={signed}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View attachment
                            </a>
                          ) : (
                            <div className="text-xs opacity-70">
                              Loading attachment…
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          <form
            onSubmit={sendMessage}
            className="border-t border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-100">
                File
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busy ? "..." : "Send"}
              </button>
            </div>

            {file ? (
              <div className="mt-2 text-xs text-slate-500">
                Selected: {file.name}{" "}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => setFile(null)}
                >
                  remove
                </button>
              </div>
            ) : null}
          </form>
        </div>
      )}
    </>
  );
}
