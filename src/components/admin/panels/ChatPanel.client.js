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

  const [mobileListOpen, setMobileListOpen] = useState(false);

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

  const canSend = useMemo(
    () => !sending && !!activeId && text.trim().length > 0,
    [sending, activeId, text],
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

    // Do not auto-push mobile users into a thread view unexpectedly.
    setActiveId((prev) => {
      if (prev && rows.some((r) => r.id === prev)) return prev;
      return rows[0]?.id || null;
    });
  }, []);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

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
    if (convoChannelRef.current) {
      supabase.removeChannel(convoChannelRef.current);
      convoChannelRef.current = null;
    }

    if (allMessagesChannelRef.current) {
      supabase.removeChannel(allMessagesChannelRef.current);
      allMessagesChannelRef.current = null;
    }

    const convoChannel = supabase
      .channel("admin-conversations-all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations();
        },
      )
      .subscribe();

    const allMessagesChannel = supabase
      .channel("admin-messages-all")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const incoming = payload.new;
          if (!incoming?.conversation_id) return;

          const isCustomerMessage = incoming.sender === "customer";

          setConvos((prev) =>
            upsertSortedConversations(prev, {
              id: incoming.conversation_id,
              last_message_at: incoming.created_at,
              created_at: incoming.created_at,
              unread_count:
                incoming.conversation_id === activeId ? 0 : undefined,
            }),
          );

          if (incoming.conversation_id === activeId) {
            setMessages((prev) => upsertMessageList(prev, incoming));

            await markDeliveredAsAdmin(activeId);
            if (document.visibilityState === "visible") {
              await markReadAsAdmin(activeId);
            }

            scrollToBottom();
          }

          if (isCustomerMessage) {
            playNotification();
            loadConversations();
          }
        },
      )
      .subscribe();

    convoChannelRef.current = convoChannel;
    allMessagesChannelRef.current = allMessagesChannel;

    return () => {
      if (convoChannelRef.current) {
        supabase.removeChannel(convoChannelRef.current);
        convoChannelRef.current = null;
      }
      if (allMessagesChannelRef.current) {
        supabase.removeChannel(allMessagesChannelRef.current);
        allMessagesChannelRef.current = null;
      }
    };
  }, [
    activeId,
    loadConversations,
    markDeliveredAsAdmin,
    markReadAsAdmin,
    playNotification,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setCustomerOnline(false);
      setTypingCustomer(false);
      return;
    }

    if (activeDbChannelRef.current) {
      supabase.removeChannel(activeDbChannelRef.current);
      activeDbChannelRef.current = null;
    }

    if (activeMetaChannelRef.current) {
      activeMetaChannelRef.current.untrack().catch(() => {});
      supabase.removeChannel(activeMetaChannelRef.current);
      activeMetaChannelRef.current = null;
    }

    loadMessages(activeId);

    const dbChannel = supabase
      .channel(`admin-active-messages-${activeId}`)
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

          if (incoming.sender === "customer") {
            await markDeliveredAsAdmin(activeId);
            if (document.visibilityState === "visible") {
              await markReadAsAdmin(activeId);
            }
            playNotification();
          }

          scrollToBottom();
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
          const incoming = payload.new;
          if (!incoming?.id) return;
          setMessages((prev) => upsertMessageList(prev, incoming));
        },
      )
      .subscribe();

    activeDbChannelRef.current = dbChannel;

    if (adminUserId) {
      const metaChannel = supabase.channel(`admin-chat-meta-${activeId}`, {
        config: {
          private: true,
          presence: { key: `admin:${adminUserId}:${activeId}` },
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
    playNotification,
    scrollToBottom,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!activeId) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        markReadAsAdmin(activeId);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    onVisible();

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

  async function sendMessage(e) {
    e.preventDefault();
    if (!canSend) return;

    try {
      setSending(true);

      const content = text.trim();

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

      if (error) throw error;

      setMessages((prev) => upsertMessageList(prev, data));
      setText("");
      scrollToBottom();

      if (isTypingRef.current) {
        isTypingRef.current = false;
        await sendTyping(false);
      }
    } catch (e) {
      setErr(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleSelectConversation(id) {
    setActiveId(id);
    setMobileListOpen(false);
  }

  function renderConversationList() {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-bold text-slate-900">Chats</div>
          <div className="mt-1 text-xs text-slate-500">
            Select a conversation to reply.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-500">Loading...</div>
          ) : err ? (
            <div className="px-3 py-3 text-sm text-rose-600">{err}</div>
          ) : convos.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">
              No conversations yet.
            </div>
          ) : (
            <div className="space-y-2">
              {convos.map((c) => {
                const isActive = c.id === activeId;
                const unread = Number(c.unread_count || 0);
                const customerName =
                  c.customer_name?.trim() ||
                  c.customer_email?.trim() ||
                  c.customer_phone?.trim() ||
                  "Customer";
                const customerPhone = c.customer_phone?.trim();

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={cx(
                      "w-full rounded-2xl border px-3 py-3 text-left transition cursor-pointer",
                      isActive
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {customerName}
                        </div>
                        {customerPhone ? (
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {customerPhone}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[11px] text-slate-400">
                          {formatTime(c.last_message_at || c.created_at)}
                        </div>
                        {unread > 0 ? (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-black">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 truncate text-xs text-slate-600">
                      {c.last_message_preview || "Open conversation"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <audio
        ref={audioRef}
        preload="auto"
        src="/sounds/chat-notification.mp3"
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Customer Chats</h3>
          <p className="text-sm text-slate-600">
            Reply to customer questions, orders, and payment confirmations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileListOpen(true)}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 md:hidden cursor-pointer"
        >
          Chats
        </button>
      </div>

      <div className="flex h-[600px] overflow-hidden rounded-2xl">
        {/* Desktop sidebar */}
        <div className="hidden w-[320px] flex-shrink-0 pr-3 md:block">
          {renderConversationList()}
        </div>

        {/* Mobile slide-over list */}
        {mobileListOpen ? (
          <div className="fixed inset-0 z-[70] md:hidden">
            <button
              type="button"
              aria-label="Close chat list"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileListOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[88vw] max-w-[360px] bg-white p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">
                  Conversations
                </div>
                <button
                  type="button"
                  onClick={() => setMobileListOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="h-[calc(100%-48px)]">
                {renderConversationList()}
              </div>
            </div>
          </div>
        ) : null}

        {/* Chat pane */}
        <div className="min-w-0 flex-1">
          <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90">
            {active ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {active.customer_name?.trim() ||
                        active.customer_email?.trim() ||
                        active.customer_phone?.trim() ||
                        "Customer"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {active.customer_phone?.trim() ? (
                        <span>{active.customer_phone.trim()}</span>
                      ) : null}
                      {active.customer_email?.trim() ? (
                        <span>{active.customer_email.trim()}</span>
                      ) : null}
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5",
                          customerOnline
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {customerOnline
                          ? "Customer online"
                          : "Customer offline"}
                      </span>
                      {typingCustomer ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                          Customer typing…
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileListOpen(true)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold md:hidden cursor-pointer"
                    >
                      Chats
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No messages yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((m) => {
                        const isMe = m.sender === "admin";
                        const signed = m.attachment_url
                          ? signedMap[m.attachment_url]
                          : "";
                        const outgoingStatus = getAdminOutgoingStatus(m);

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
                                  ? "bg-slate-900 text-white"
                                  : "bg-amber-50 text-slate-800",
                              )}
                            >
                              <div
                                className={cx(
                                  "text-[11px]",
                                  isMe ? "text-white/70" : "text-slate-500",
                                )}
                              >
                                {formatTime(m.created_at)}
                                {outgoingStatus ? ` • ${outgoingStatus}` : ""}
                              </div>

                              {m.content ? (
                                <div className="mt-1 whitespace-pre-wrap break-words">
                                  {m.content}
                                </div>
                              ) : null}

                              {m.attachment_url ? (
                                <div
                                  className={cx(m.content ? "mt-2" : "mt-1")}
                                >
                                  {signed ? (
                                    <a
                                      href={signed}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={cx(
                                        "text-xs underline",
                                        isMe
                                          ? "text-white/80"
                                          : "text-slate-600",
                                      )}
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
                  )}
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex gap-2">
                    <input
                      value={text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                    />

                    <button
                      type="submit"
                      disabled={!canSend}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500">
                    {active.last_message_at ? (
                      <>
                        Last activity: {formatDateTime(active.last_message_at)}
                      </>
                    ) : (
                      <>
                        Conversation created:{" "}
                        {formatDateTime(active.created_at)}
                      </>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                Select a conversation to view messages.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
