import { supabase } from "@/lib/supabase/client";

export async function createOrderConversation({ userId, order }) {
  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .insert({
      customer_id: userId,
      status: "open",
      order_id: order.id,
    })
    .select()
    .single();

  if (convoError) throw convoError;

  const itemsText = order.items
    .map(
      (item) =>
        `• ${item.name} (x${item.quantity}) — ₦${Number(item.price).toLocaleString()}`,
    )
    .join("\n");

  const message = [
    `🧾 Order ${order.order_code || `#${order.id}`}`,
    "",
    itemsText,
    "",
    `Total: ₦${Number(order.total_amount).toLocaleString()}`,
    order.requires_deposit
      ? `Deposit Required: ₦${Number(order.deposit_amount).toLocaleString()}`
      : "Pay on delivery available",
  ].join("\n");

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: convo.id,
    sender: "customer",
    content: message,
  });

  if (messageError) throw messageError;

  return convo;
}
