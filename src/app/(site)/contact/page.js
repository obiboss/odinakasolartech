import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { getStore } from "@/lib/content.server";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = {
  title: "Contact — Odinaka Solar Tech",
  description:
    "Chat on WhatsApp for product availability, prices, and delivery.",
};

export default function ContactPage() {
  const store = {
    business: {
      name: "Odinaka Solar Tech",
      whatsapp: "2348000000000",
      location: "Lagos, Nigeria",
      hours: "Mon - Sat",
      phone: "08000000000",
    },
  };
  const wa = whatsappLink({
    phone: store.business.whatsapp,
    message: `Hello ${store.business.name}, I need a solar quote.`,
  });

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold">Contact</h1>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 max-w-xl">
        <div className="text-white/80">{store.business.location}</div>
        <div className="text-white/60 text-sm mt-1">{store.business.hours}</div>
        <div className="mt-4 flex gap-2">
          <Button
            as="a"
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="bg-solar-500/20 border-solar-500/30"
          >
            WhatsApp
          </Button>
          <Button as="a" href={`tel:${store.business.phone}`}>
            Call
          </Button>
        </div>
      </div>
    </Container>
  );
}
