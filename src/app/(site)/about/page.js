import Container from "@/components/ui/Container";
import { getStore } from "@/lib/content.server";

export const metadata = {
  title: "About — Odinaka Solar Tech",
  description:
    "Trusted solar dealer for premium products and installation materials in Nigeria.",
};

export default function AboutPage() {
  const store = getStore();
  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-3 text-slate-700 max-w-2xl">
        {store.business.name} supplies premium solar components and installation
        materials for homes, SMEs, estates and projects. We help you choose the
        right setup and get fast quotes.
      </p>
    </Container>
  );
}
