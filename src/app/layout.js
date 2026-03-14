import "./globals.css";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { CartProvider } from "@/components/cart/CartContext.client";

export const metadata = {
  verification: {
    google: "fDkgVoJ3JVpDNunrMWdS3DoRnep6kFV1OF4fMz9VzaE",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <CartProvider>{children}</CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
