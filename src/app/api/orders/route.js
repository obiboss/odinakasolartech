import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_QUANTITY = 100;
const MAX_TEXT_LENGTH = 500;

function text(value, field, required = false) {
  const result = String(value ?? "").trim();
  if (required && !result) throw new Error(`${field} is required.`);
  if (result.length > MAX_TEXT_LENGTH) throw new Error(`${field} is too long.`);
  return result || null;
}

function quantity(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > MAX_QUANTITY) {
    throw new Error("Invalid item quantity.");
  }
  return result;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Customer session required." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const cartItems = Array.isArray(body?.cartItems) ? body.cartItems : [];
    if (!cartItems.length) throw new Error("Cart is empty.");

    const customer = body?.customer || {};
    const customerName = text(customer.name, "Full name", true);
    const customerPhone = text(customer.phone, "Phone number", true);
    const customerAddress = text(customer.address, "Delivery address", true);
    const customerCity = text(customer.city, "City", true);
    const customerState = text(customer.state, "State", true);

    const resolvedItems = [];
    for (const item of cartItems) {
      const productId = String(item?.product_id || "").trim();
      const packageId = item?.package_id
        ? String(item.package_id).trim()
        : null;
      if (!productId) throw new Error("A cart item is missing its product.");

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id,name,price,active")
        .eq("id", productId)
        .eq("active", true)
        .maybeSingle();
      if (productError) throw productError;
      if (!product)
        throw new Error("A product in your cart is no longer available.");

      let packageRecord = null;
      if (packageId) {
        const { data, error } = await supabase
          .from("product_packages")
          .select("id,product_id,name,price,active")
          .eq("id", packageId)
          .eq("product_id", product.id)
          .eq("active", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error(
            "A selected package is no longer available. Refresh the product and choose a current package.",
          );
        }
        packageRecord = data;
      }

      const price = Number(packageRecord?.price ?? product.price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("A product price is invalid. Please contact support.");
      }

      const itemQuantity = quantity(item.quantity);
      resolvedItems.push({
        product_id: product.id,
        quantity: itemQuantity,
        price_at_purchase: price,
        package_id: packageRecord?.id || null,
        package_name: packageRecord?.name || null,
      });
    }

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.price_at_purchase * item.quantity,
      0,
    );
    const requiresDeposit = totalAmount > 3000000;
    const depositAmount = requiresDeposit ? Math.round(totalAmount * 0.6) : 0;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_city: customerCity,
        customer_state: customerState,
        payment_method: requiresDeposit ? "bank_transfer" : "pay_on_delivery",
        status: "pending",
        total_amount: totalAmount,
        requires_deposit: requiresDeposit,
        deposit_amount: depositAmount,
        payment_status: "pending",
        currency: "NGN",
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(resolvedItems.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw itemsError;

    return NextResponse.json({ order: { ...order, items: resolvedItems } });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to create order." },
      { status: 400 },
    );
  }
}
