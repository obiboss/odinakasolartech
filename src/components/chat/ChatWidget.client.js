"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function upsertMessages(prev, incoming) {
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

function getCustomerOutgoingStatus(message) {
  if (message.sender !== "customer") return "";
  if (message.read_by_admin_at) return "Read";
  if (message.delivered_to_admin_at) return "Delivered";
  return "Sent";
}

async function ensureSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data?.session) return data.session;

  const { data: anon, error: anonError } =
    await supabase.auth.signInAnonymously();
  if (anonError) throw anonError;

  return anon.session;
}

async function getOrCreateConversation(userId) {
  const { data: existing, error: selErr } = await supabase
    .from("conversations")
    .select("id,status,created_at,customer_name,customer_phone,customer_email")
    .eq("customer_id", userId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) throw selErr;
  if (existing?.[0]?.id) return existing[0];

  const { data: created, error: insErr } = await supabase
    .from("conversations")
    .insert({
      customer_id: userId,
      status: "open",
      order_id: null,
    })
    .select("id,customer_name,customer_phone,customer_email")
    .single();

  if (insErr) throw insErr;
  return created;
}

async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
    )
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
  return { bucket: "chat-uploads", path };
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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [customerUserId, setCustomerUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [signedMap, setSignedMap] = useState({});
  const [adminOnline, setAdminOnline] = useState(false);
  const [typingAdmin, setTypingAdmin] = useState(false);
  const [order, setOrder] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const bottomRef = useRef(null);
  const dbChannelRef = useRef(null);
  const metaChannelRef = useRef(null);
  const adminPresenceChannelRef = useRef(null);
  const audioRef = useRef(null);
  const hydratedRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const adminTypingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  const canSend = useMemo(
    () =>
      !busy &&
      !!conversationId &&
      !showCustomerForm &&
      (text.trim().length > 0 || !!file),
    [busy, conversationId, showCustomerForm, text, file],
  );

  const playNotification = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const markDeliveredAsCustomer = useCallback(async (cid) => {
    if (!cid) return;
    await supabase.rpc("customer_mark_conversation_delivered", {
      p_conversation_id: cid,
    });
  }, []);

  const markReadAsCustomer = useCallback(
    async (cid) => {
      if (!cid || !open || document.visibilityState !== "visible") return;

      const { error } = await supabase.rpc("customer_mark_conversation_read", {
        p_conversation_id: cid,
      });

      if (error) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.sender === "admin" && !m.read_by_customer_at
            ? {
                ...m,
                delivered_to_customer_at:
                  m.delivered_to_customer_at || new Date().toISOString(),
                read_by_customer_at: new Date().toISOString(),
              }
            : m,
        ),
      );
    },
    [open],
  );

  const sendTyping = useCallback(
    async (typing) => {
      const channel = metaChannelRef.current;
      if (!channel || !conversationId) return;

      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          actor: "customer",
          conversationId,
          typing,
        },
      });
    },
    [conversationId],
  );

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

  function handlePointerDown(e) {
    if (!buttonRef.current) return;
    draggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { ...position };
    buttonRef.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!buttonRef.current || e.pressure === 0) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.hypot(dx, dy);
    const dragging = distance > 5;

    if (dragging) {
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

    draggingRef.current = dragging;
    setIsDragging(dragging);
  }

  function handlePointerUp(e) {
    if (!buttonRef.current) return;
    try {
      buttonRef.current.releasePointerCapture(e.pointerId);
    } catch {}
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

        setCustomerUserId(session.user.id);

        const conversation = await getOrCreateConversation(session.user.id);

        if (!alive) return;

        setConversationId(conversation.id);

        const hasCustomerInfo =
          conversation.customer_name &&
          conversation.customer_name.trim() !== "";

        setCustomerDetails({
          name: conversation.customer_name || "",
          phone: conversation.customer_phone || "",
          email: conversation.customer_email || "",
        });

        setShowCustomerForm(!hasCustomerInfo);

        const initial = await fetchMessages(conversation.id);
        if (!alive) return;

        setMessages(initial);
        hydratedRef.current = true;

        await markDeliveredAsCustomer(conversation.id);
      } catch (e) {
        if (alive) setBootError(e?.message || "Chat failed to start.");
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [markDeliveredAsCustomer]);

  useEffect(() => {
    if (!conversationId) return;

    let alive = true;

    (async () => {
      try {
        const { data: convo, error: convoErr } = await supabase
          .from("conversations")
          .select("order_id")
          .eq("id", conversationId)
          .single();

        if (convoErr || !convo?.order_id) {
          if (alive) {
            setOrder(null);
            setPaymentSettings(null);
          }
          return;
        }

        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .select(
            "id,order_code,total_amount,requires_deposit,deposit_amount,payment_status,currency",
          )
          .eq("id", convo.order_id)
          .single();

        if (orderErr) {
          if (alive) {
            setOrder(null);
            setPaymentSettings(null);
          }
          return;
        }

        const { data: paymentData, error: paymentErr } = await supabase
          .from("payment_settings")
          .select("id,bank_name,account_name,account_number,instructions")
          .eq("is_active", true)
          .maybeSingle();

        if (alive) {
          setOrder(orderData ?? null);
          setPaymentSettings(paymentErr ? null : (paymentData ?? null));
        }
      } catch (err) {
        if (alive) {
          setOrder(null);
          setPaymentSettings(null);
        }
        console.error("Order/payment fetch failed", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!customerUserId) return;

    const channel = supabase.channel("support-admin-presence", {
      config: { private: true },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const entries = Object.values(state).flat();
        const online = entries.some((item) => item?.role === "admin");
        setAdminOnline(online);
      })
      .subscribe();

    adminPresenceChannelRef.current = channel;

    return () => {
      if (adminPresenceChannelRef.current) {
        supabase.removeChannel(adminPresenceChannelRef.current);
        adminPresenceChannelRef.current = null;
      }
    };
  }, [customerUserId]);

  useEffect(() => {
    if (!conversationId) return;

    if (dbChannelRef.current) {
      supabase.removeChannel(dbChannelRef.current);
      dbChannelRef.current = null;
    }

    if (metaChannelRef.current) {
      metaChannelRef.current.untrack().catch(() => {});
      supabase.removeChannel(metaChannelRef.current);
      metaChannelRef.current = null;
    }

    const dbChannel = supabase
      .channel(`customer-messages-db-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const incoming = payload.new;
          if (!incoming?.id) return;

          const isIncomingAdminMessage = incoming.sender === "admin";

          setMessages((prev) => upsertMessages(prev, incoming));

          if (isIncomingAdminMessage) {
            await markDeliveredAsCustomer(conversationId);

            if (open && document.visibilityState === "visible") {
              await markReadAsCustomer(conversationId);
            }

            if (hydratedRef.current) {
              playNotification();
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
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new;
          if (!incoming?.id) return;
          setMessages((prev) => upsertMessages(prev, incoming));
        },
      )
      .subscribe();

    dbChannelRef.current = dbChannel;

    if (customerUserId) {
      const metaChannel = supabase.channel(`chat-meta-${conversationId}`, {
        config: {
          private: true,
          presence: { key: `customer:${customerUserId}` },
        },
      });

      metaChannel
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.actor !== "admin") return;

          const typing = Boolean(payload?.typing);
          setTypingAdmin(typing);

          if (adminTypingTimeoutRef.current) {
            clearTimeout(adminTypingTimeoutRef.current);
          }

          if (typing) {
            adminTypingTimeoutRef.current = setTimeout(() => {
              setTypingAdmin(false);
            }, 1500);
          }
        })
        .on("presence", { event: "sync" }, () => {})
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await metaChannel.track({
              role: "customer",
              user_id: customerUserId,
              conversation_id: conversationId,
              online_at: new Date().toISOString(),
            });
          }
        });

      metaChannelRef.current = metaChannel;
    }

    (async () => {
      const latest = await fetchMessages(conversationId);
      setMessages(latest);
      await markDeliveredAsCustomer(conversationId);
      if (open && document.visibilityState === "visible") {
        await markReadAsCustomer(conversationId);
      }
      hydratedRef.current = true;
    })();

    return () => {
      if (dbChannelRef.current) {
        supabase.removeChannel(dbChannelRef.current);
        dbChannelRef.current = null;
      }

      if (metaChannelRef.current) {
        metaChannelRef.current.untrack().catch(() => {});
        supabase.removeChannel(metaChannelRef.current);
        metaChannelRef.current = null;
      }

      if (adminTypingTimeoutRef.current) {
        clearTimeout(adminTypingTimeoutRef.current);
        adminTypingTimeoutRef.current = null;
      }

      setTypingAdmin(false);
    };
  }, [
    conversationId,
    customerUserId,
    open,
    markDeliveredAsCustomer,
    markReadAsCustomer,
    playNotification,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!conversationId || !open) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        markReadAsCustomer(conversationId);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    onVisible();

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [conversationId, open, markReadAsCustomer]);

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

    if (!conversationId) return;

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

  async function handleIHavePaid() {
    if (!conversationId) return;

    try {
      setBusy(true);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender: "customer",
          content:
            "✅ I have made the payment. Please confirm. I will upload proof shortly.",
        })
        .select(
          "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
        )
        .single();

      if (error) throw error;

      setMessages((prev) => upsertMessages(prev, data));
    } catch (err) {
      alert(err?.message || "Failed to send payment confirmation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomerDetails() {
    if (!conversationId) return false;

    if (!customerDetails.name.trim()) {
      alert("Please enter your name.");
      return false;
    }

    try {
      setBusy(true);

      const { error } = await supabase
        .from("conversations")
        .update({
          customer_name: customerDetails.name.trim(),
          customer_phone: customerDetails.phone.trim() || null,
          customer_email: customerDetails.email.trim() || null,
        })
        .eq("id", conversationId);

      if (error) throw error;

      setShowCustomerForm(false);
      return true;
    } catch (err) {
      alert(err.message || "Unable to save your details.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();

    if (showCustomerForm) {
      const ok = await saveCustomerDetails();
      if (!ok) return;
    }

    if (!canSend) return;

    setBusy(true);

    try {
      let attachment_url = null;
      let attachment_type = null;

      if (file) {
        const uploaded = await uploadChatFile({
          conversationId,
          file,
        });

        attachment_url = `${uploaded.bucket}/${uploaded.path}`;
        attachment_type = file.type || "application/octet-stream";
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender: "customer",
          content: text.trim(),
          attachment_url,
          attachment_type,
        })
        .select(
          "id,conversation_id,sender,content,attachment_url,attachment_type,created_at,delivered_to_admin_at,delivered_to_customer_at,read_by_admin_at,read_by_customer_at",
        )
        .single();

      if (error) throw error;

      setMessages((prev) => upsertMessages(prev, data));

      setText("");
      setFile(null);

      if (isTypingRef.current) {
        isTypingRef.current = false;
        await sendTyping(false);
      }
    } catch (err) {
      alert(err.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        src="/sounds/chat-notification.mp3"
      />

      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleButtonClick}
        aria-label="Open chat support"
        style={{ left: position.x, top: position.y }}
        className={cx(
          "fixed z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#F5A200]",
          "shadow-[0_14px_40px_rgba(0,0,0,0.28)] transition-transform duration-200 hover:scale-105",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-5 z-[80] w-[92vw] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white/90 text-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold">
                Support Chat
                {customerDetails.name ? ` • ${customerDetails.name}` : ""}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <span
                  className={cx(
                    "rounded-full px-2 py-0.5",
                    adminOnline
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {adminOnline ? "Admin online" : "Admin offline"}
                </span>
                {typingAdmin ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                    Admin typing…
                  </span>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="max-h-[52vh] overflow-auto px-3 py-3">
            {bootError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bootError}
              </div>
            ) : null}

            {order?.requires_deposit && paymentSettings ? (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-semibold text-amber-800">
                  Deposit Required
                </div>

                <div className="mt-1 text-sm text-amber-900">
                  ₦{Number(order.deposit_amount).toLocaleString()}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-700">
                  <div className="font-medium">Bank Details</div>
                  <div>{paymentSettings.bank_name}</div>
                  <div>{paymentSettings.account_name}</div>

                  <div className="flex items-center gap-2">
                    <span>{paymentSettings.account_number}</span>

                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          paymentSettings.account_number,
                        )
                      }
                      className="text-xs text-blue-600 underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {paymentSettings.instructions ? (
                  <div className="mt-2 text-[11px] text-slate-600">
                    {paymentSettings.instructions}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleIHavePaid}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  I have paid
                </button>
              </div>
            ) : null}

            {!bootError && !showCustomerForm && messages.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Ask a question, upload payment proof, or send us any enquiry.
              </div>
            ) : null}

            {showCustomerForm ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Before we start
                </div>

                <p className="mt-1 text-xs text-slate-600">
                  Please tell us who you are so our support team can follow up
                  with you.
                </p>

                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    placeholder="Your full name *"
                    value={customerDetails.name}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={customerDetails.phone}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  <input
                    type="email"
                    placeholder="Email address (optional)"
                    value={customerDetails.email}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={saveCustomerDetails}
                    disabled={busy}
                    className="w-full rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Continue to Chat"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-2 space-y-2">
              {messages.map((m) => {
                const isMe = m.sender === "customer";
                const signed = m.attachment_url
                  ? signedMap[m.attachment_url]
                  : "";
                const outgoingStatus = getCustomerOutgoingStatus(m);

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
                      <div
                        className={cx(
                          "text-[11px]",
                          isMe ? "text-black/70" : "text-slate-500",
                        )}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {outgoingStatus ? ` • ${outgoingStatus}` : ""}
                      </div>

                      {m.content ? (
                        <div className="mt-1 whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                      ) : null}

                      {m.attachment_url ? (
                        <div className={cx(m.content ? "mt-2" : "mt-1")}>
                          {signed ? (
                            <a
                              className={cx(
                                "text-xs underline",
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
              <label
                className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold ${
                  showCustomerForm
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-slate-100"
                }`}
              >
                File
                <input
                  type="file"
                  disabled={showCustomerForm}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <input
                value={text}
                disabled={showCustomerForm}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={
                  showCustomerForm
                    ? "Complete your details above first"
                    : "Type your message..."
                }
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />

              <button
                type="submit"
                disabled={!canSend || showCustomerForm}
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {busy ? "..." : "Send"}
              </button>
            </div>

            {!showCustomerForm && file ? (
              <div className="mt-2 text-xs text-slate-500">
                Selected: {file.name}
                <button
                  type="button"
                  className="ml-2 underline cursor-pointer"
                  onClick={() => setFile(null)}
                >
                  remove
                </button>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
