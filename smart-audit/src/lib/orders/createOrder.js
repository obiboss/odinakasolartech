import { supabase } from "@/lib/supabase/client";

export async function createOrder({ cartItems, customer, total, customerId }) {
  if (!cartItems?.length) {
    throw new Error("Cart is empty");
  }

  const requiresDeposit = total > 3000000;
  const depositAmount = requiresDeposit ? Math.round(total * 0.6) : 0;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId ?? null,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address ?? null,
      customer_city: customer.city ?? null,
      customer_state: customer.state ?? null,
      payment_method: requiresDeposit ? "bank_transfer" : "pay_on_delivery",
      status: "pending",
      total_amount: total,
      requires_deposit: requiresDeposit,
      deposit_amount: depositAmount,
      payment_status: "pending",
      currency: "NGN",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const itemsPayload = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    price_at_purchase: item.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsPayload);

  if (itemsError) throw itemsError;

  return {
    ...order,
    items: cartItems,
  };
}
