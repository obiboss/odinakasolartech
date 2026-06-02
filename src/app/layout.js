import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/cart/CartContext.client";
import { GlobalLoaderProvider } from "@/components/ui/GlobalLoaderProvider.client";
import MetaPixel from "@/components/analytics/MetaPixel.client";

export const metadata = {
  metadataBase: new URL("https://www.odinakachukwusolartech.com"),
  title: {
    default: "Odinaka Solar Tech",
    template: "%s | Odinaka Solar Tech",
  },
  description:
    "Premium solar products and installation materials for homes, SMEs, and estates in Nigeria.",
  verification: {
    google: "fDkgVoJ3JVpDNunrMWdS3DoRnep6kFV1OF4fMz9VzaE",
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MetaPixel />

        <ThemeProvider>
          <GlobalLoaderProvider>
            <CartProvider>{children}</CartProvider>
          </GlobalLoaderProvider>
        </ThemeProvider>
      </body>

      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
