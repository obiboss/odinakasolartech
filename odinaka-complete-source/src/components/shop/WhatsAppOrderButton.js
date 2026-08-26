import Button from "@/components/ui/Button";
import { whatsappLink, buildOrderMessage } from "@/lib/whatsapp";
import { getStore } from "@/lib/content.server";

export default function WhatsAppOrderButton({ product }) {
  const store = getStore();
  const msg = buildOrderMessage({
    businessName: store.business.name,
    product,
    quantity: 1,
  });

  const href = whatsappLink({ phone: store.business.whatsapp, message: msg });

  return (
    <Button
      as="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-full bg-solar-500/20 hover:bg-solar-500/25 border-solar-500/30"
    >
      Order on WhatsApp
    </Button>
  );
}
