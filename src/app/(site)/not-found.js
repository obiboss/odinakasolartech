import Link from "next/link";
import Container from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>

      <p className="mt-2 text-slate-600">
        The page you’re looking for doesn’t exist.
      </p>

      <Link
        className="inline-block mt-4 font-semibold text-amber-600 hover:underline"
        href="/shop"
      >
        Go to Shop →
      </Link>
    </Container>
  );
}
