"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function upsertSortedConversations(prev, incoming) {
  const next = [...prev];
  const idx = next.findIndex((c) => c.id === incoming.id);

  if (idx >= 0) {
    next[idx] = { ...next[idx], ...incoming };
  } else {
    next.push(incoming);
  }

  next.sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at || 0).getTime() -
      new Date(a.last_message_at || a.created_at || 0).getTime(),
  );

  return next;
}

function upsertMessageList(prev, incoming) {
  if (!incoming?.id) return prev;
  const idx = prev.findIndex((m) => m.id === incoming.id);

  if (idx >= 0) {
    const next = [...prev];
    next[idx] = { ...next[idx], ...incoming };
    return next;
  }

  return [...prev, incoming].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function getAdminOutgoingStatus(message) {
  if (message.sender !== "admin") return "";
  if (message.read_by_customer_at) return "Read";
  if (message.delivered_to_customer_at) return "Delivered";
  return "Sent";
}

async function getSignedUrl(fullPath) {
  const [bucket, ...rest] = fullPath.split("/");
  const path = rest.join("/");

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 30);

  if (error) throw error;
  return data.signedUrl;
}

export default function ChatPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [signedMap, setSignedMap] = useState({});

  const [adminUserId, setAdminUserId] = useState(null);
  const [customerOnline, setCustomerOnline] = useState(false);
  const [typingCustomer, setTypingCustomer] = useState(false);

  const bottomRef = useRef(null);
  const activeDbChannelRef = useRef(null);
  const activeMetaChannelRef = useRef(null);
  const allMessagesChannelRef = useRef(null);
  const convoChannelRef = useRef(null);
  const adminPresenceChannelRef = useRef(null);
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const customerTypingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const active = useMemo(
    () => convos.find((c) => c.id === activeId) || null,
    [activeId, convos],
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const playNotification = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const markDeliveredAsAdmin = useCallback(async (conversationId) => {
    if (!conversationId) return;
    await supabase.rpc("admin_mark_conversation_delivered", {
      p_conversation_id: conversationId,
    });
  }, []);

  const markReadAsAdmin = useCallback(async (conversationId) => {
    if (!conversationId || document.visibilityState !== "visible") return;

    const { error } = await supabase.rpc("admin_mark_conversation_read", {
      p_conversation_id: conversationId,
    });

    if (error) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.sender === "customer" && !m.read_by_admin_at
          ? {
              ...m,
              delivered_to_admin_at:
                m.delivered_to_admin_at || new Date().toISOString(),
              read_by_admin_at: new Date().toISOString(),
            }
          : m,
      ),
    );

    setConvos((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c,
      ),
    );
  }, []);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_conversations");

    if (error) {
      setErr(error.message);
      return;
    }

    const rows = (data || []).map((row) => ({
      ...row,
      unread_count: Number(row.unread_count || 0),
    }));

    setConvos(rows);
    setActiveId((prev) => prev || rows[0]?.id || null);
  }, []);

  const loadMessages = useCallback(
    async (conversationId) => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        setErr(error.message);
        return;
      }

      setMessages(data || []);
      scrollToBottom();
      await markDeliveredAsAdmin(conversationId);
      await markReadAsAdmin(conversationId);
    },
    [scrollToBottom, markDeliveredAsAdmin, markReadAsAdmin],
  );

  const sendTyping = useCallback(
    async (typing) => {
      const channel = activeMetaChannelRef.current;
      if (!channel || !activeId) return;

      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          actor: "admin",
          conversationId: activeId,
          typing,
        },
      });
    },
    [activeId],
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;
      setAdminUserId(user?.id || null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      await loadConversations();
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!adminUserId) return;

    const channel = supabase.channel("support-admin-presence", {
      config: {
        private: true,
        presence: { key: `admin:${adminUserId}` },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            role: "admin",
            user_id: adminUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    adminPresenceChannelRef.current = channel;

    return () => {
      if (adminPresenceChannelRef.current) {
        adminPresenceChannelRef.current.untrack().catch(() => {});
        supabase.removeChannel(adminPresenceChannelRef.current);
        adminPresenceChannelRef.current = null;
      }
    };
  }, [adminUserId]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          const newConvo = payload.new;
          if (!newConvo?.id) return;

          setConvos((prev) =>
            upsertSortedConversations(prev, { ...newConvo, unread_count: 0 }),
          );
          setActiveId((prev) => prev || newConvo.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new;
          if (!updated?.id) return;

          setConvos((prev) => {
            const existing = prev.find((c) => c.id === updated.id);
            return upsertSortedConversations(prev, {
              ...updated,
              unread_count: existing?.unread_count || 0,
            });
          });
        },
      )
      .subscribe();

    convoChannelRef.current = channel;

    return () => {
      if (convoChannelRef.current) {
        supabase.removeChannel(convoChannelRef.current);
        convoChannelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-messages-all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new;
          if (!msg?.id || !msg?.conversation_id) return;

          setConvos((prev) => {
            const visibleActive =
              msg.conversation_id === activeId &&
              document.visibilityState === "visible";

            let found = false;
            const next = prev.map((c) => {
              if (c.id !== msg.conversation_id) return c;
              found = true;

              const shouldIncrement =
                msg.sender === "customer" && !visibleActive;

              return {
                ...c,
                last_message_at: msg.created_at,
                unread_count: shouldIncrement
                  ? Number(c.unread_count || 0) + 1
                  : visibleActive
                    ? 0
                    : Number(c.unread_count || 0),
              };
            });

            if (!found) {
              next.push({
                id: msg.conversation_id,
                customer_id: null,
                status: "open",
                created_at: msg.created_at,
                last_message_at: msg.created_at,
                unread_count:
                  msg.sender === "customer" &&
                  !(
                    msg.conversation_id === activeId &&
                    document.visibilityState === "visible"
                  )
                    ? 1
                    : 0,
              });
            }

            next.sort(
              (a, b) =>
                new Date(b.last_message_at || b.created_at).getTime() -
                new Date(a.last_message_at || a.created_at).getTime(),
            );

            return next;
          });

          if (msg.sender === "customer") {
            await markDeliveredAsAdmin(msg.conversation_id);

            const shouldReadNow =
              msg.conversation_id === activeId &&
              document.visibilityState === "visible";

            if (shouldReadNow) {
              await markReadAsAdmin(msg.conversation_id);
            } else {
              playNotification();
            }
          }
        },
      )
      .subscribe();

    allMessagesChannelRef.current = channel;

    return () => {
      if (allMessagesChannelRef.current) {
        supabase.removeChannel(allMessagesChannelRef.current);
        allMessagesChannelRef.current = null;
      }
    };
  }, [activeId, markDeliveredAsAdmin, markReadAsAdmin, playNotification]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setCustomerOnline(false);
      setTypingCustomer(false);
      return;
    }

    loadMessages(activeId);

    if (activeDbChannelRef.current) {
      supabase.removeChannel(activeDbChannelRef.current);
      activeDbChannelRef.current = null;
    }

    if (activeMetaChannelRef.current) {
      activeMetaChannelRef.current.untrack().catch(() => {});
      supabase.removeChannel(activeMetaChannelRef.current);
      activeMetaChannelRef.current = null;
    }

    const dbChannel = supabase
      .channel(`admin-messages-db-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        async (payload) => {
          const incoming = payload.new;
          if (!incoming?.id) return;

          setMessages((prev) => upsertMessageList(prev, incoming));
          scrollToBottom();

          if (incoming.sender === "customer") {
            await markDeliveredAsAdmin(activeId);

            if (document.visibilityState === "visible") {
              await markReadAsAdmin(activeId);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (!updated?.id) return;
          setMessages((prev) => upsertMessageList(prev, updated));
        },
      )
      .subscribe();

    activeDbChannelRef.current = dbChannel;

    if (adminUserId) {
      const metaChannel = supabase.channel(`chat-meta-${activeId}`, {
        config: {
          private: true,
          presence: { key: `admin:${adminUserId}` },
        },
      });

      metaChannel
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.actor !== "customer") return;

          const typing = Boolean(payload?.typing);
          setTypingCustomer(typing);

          if (customerTypingTimeoutRef.current) {
            clearTimeout(customerTypingTimeoutRef.current);
          }

          if (typing) {
            customerTypingTimeoutRef.current = setTimeout(() => {
              setTypingCustomer(false);
            }, 1500);
          }
        })
        .on("presence", { event: "sync" }, () => {
          const state = metaChannel.presenceState();
          const entries = Object.values(state).flat();
          const online = entries.some((item) => item?.role === "customer");
          setCustomerOnline(online);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await metaChannel.track({
              role: "admin",
              user_id: adminUserId,
              conversation_id: activeId,
              online_at: new Date().toISOString(),
            });
          }
        });

      activeMetaChannelRef.current = metaChannel;
    }

    return () => {
      if (activeDbChannelRef.current) {
        supabase.removeChannel(activeDbChannelRef.current);
        activeDbChannelRef.current = null;
      }

      if (activeMetaChannelRef.current) {
        activeMetaChannelRef.current.untrack().catch(() => {});
        supabase.removeChannel(activeMetaChannelRef.current);
        activeMetaChannelRef.current = null;
      }

      if (customerTypingTimeoutRef.current) {
        clearTimeout(customerTypingTimeoutRef.current);
        customerTypingTimeoutRef.current = null;
      }

      setTypingCustomer(false);
      setCustomerOnline(false);
    };
  }, [
    activeId,
    adminUserId,
    loadMessages,
    markDeliveredAsAdmin,
    markReadAsAdmin,
    scrollToBottom,
  ]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && activeId) {
        markReadAsAdmin(activeId);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeId, markReadAsAdmin]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const needed = [
        ...new Set(
          messages
            .filter((m) => m.attachment_url)
            .map((m) => m.attachment_url)
            .filter((key) => !signedMap[key]),
        ),
      ];

      if (needed.length === 0) return;

      const additions = {};
      for (const key of needed) {
        try {
          additions[key] = await getSignedUrl(key);
        } catch {}
      }

      if (!alive || Object.keys(additions).length === 0) return;
      setSignedMap((prev) => ({ ...prev, ...additions }));
    })();

    return () => {
      alive = false;
    };
  }, [messages, signedMap]);

  const handleTextChange = async (value) => {
    setText(value);

    if (!activeId) return;

    const hasValue = value.trim().length > 0;

    if (hasValue && !isTypingRef.current) {
      isTypingRef.current = true;
      await sendTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        await sendTyping(false);
      }
    }, 1200);

    if (!hasValue && isTypingRef.current) {
      isTypingRef.current = false;
      await sendTyping(false);
    }
  };

  async function send() {
    if (!activeId) return;

    const content = text.trim();
    if (!content) return;

    setSending(true);
    setErr("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        sender: "admin",
        content,
      })
      .select(
        "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
      )
      .single();

    setSending(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMessages((prev) => upsertMessageList(prev, data));
    setText("");
    if (isTypingRef.current) {
      isTypingRef.current = false;
      await sendTyping(false);
    }
    scrollToBottom();
  }

  async function uploadChatFile(file) {
    if (!activeId) return;

    setSending(true);
    setErr("");

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `chat/${activeId}/${crypto.randomUUID()}.${ext}`;

    const upload = await supabase.storage
      .from("chat-uploads")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (upload.error) {
      setSending(false);
      setErr(upload.error.message);
      return;
    }

    const attachment_url = `chat-uploads/${path}`;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeId,
        sender: "admin",
        content: file.name,
        attachment_url,
        attachment_type: file.type || "application/octet-stream",
      })
      .select(
        "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
      )
      .single();

    setSending(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMessages((prev) => upsertMessageList(prev, data));
    scrollToBottom();
  }

  async function setStatus(status) {
    if (!activeId) return;

    const { error } = await supabase
      .from("conversations")
      .update({ status })
      .eq("id", activeId);

    if (error) {
      setErr(error.message);
      return;
    }

    setConvos((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, status } : c)),
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
      <audio
        ref={audioRef}
        preload="auto"
        src="/sounds/chat-notification.mp3"
      />
      <h3 className="text-lg font-bold">Chat</h3>
      <p className="mt-1 text-sm text-slate-600">
        Handle multiple chats in one place.
      </p>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-12">
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
                      "w-full rounded-2xl border px-3 py-3 text-left transition",
                      c.id === activeId
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">
                        {c.customer_id || "Customer"}
                      </div>

                      <div className="flex items-center gap-2">
                        {Number(c.unread_count || 0) > 0 ? (
                          <span className="min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-[11px] font-bold text-white">
                            {c.unread_count}
                          </span>
                        ) : null}

                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
                          {c.status || "open"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(c.last_message_at || c.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {active ? `Chat: ${active.customer_id}` : "Select a chat"}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Status: {active?.status || "—"}</span>
                  {activeId ? (
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5",
                        customerOnline
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {customerOnline ? "Customer online" : "Customer offline"}
                    </span>
                  ) : null}
                  {typingCustomer ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                      Customer typing…
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatus("open")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                >
                  Mark open
                </button>
                <button
                  onClick={() => setStatus("closed")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                >
                  Mark closed
                </button>
              </div>
            </div>

            <div className="mt-4 h-[380px] overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
              {!activeId ? (
                <div className="text-sm text-slate-600">
                  Select a conversation to view messages.
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-slate-600">No messages yet.</div>
              ) : (
                <div className="grid gap-2">
                  {messages.map((m) => {
                    const signed = m.attachment_url
                      ? signedMap[m.attachment_url]
                      : "";
                    const outgoingStatus = getAdminOutgoingStatus(m);

                    return (
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
                          {m.sender} • {formatTime(m.created_at)}
                          {outgoingStatus ? ` • ${outgoingStatus}` : ""}
                        </div>

                        {m.content ? (
                          <div className="mt-1 whitespace-pre-wrap break-words text-slate-900">
                            {m.content}
                          </div>
                        ) : null}

                        {m.attachment_url ? (
                          signed ? (
                            <a
                              className="mt-2 inline-block text-xs font-semibold text-amber-600 underline"
                              href={signed}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open attachment
                            </a>
                          ) : (
                            <div className="mt-2 text-xs text-slate-500">
                              Loading attachment…
                            </div>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
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
                    accept="image/*,application/pdf"
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
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-95 disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Customers can send messages and attachments here in realtime.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
