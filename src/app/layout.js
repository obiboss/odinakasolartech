import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/cart/CartContext.client";
import { GlobalLoaderProvider } from "@/components/ui/GlobalLoaderProvider.client";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <GlobalLoaderProvider>
            <CartProvider>{children}</CartProvider>
          </GlobalLoaderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
