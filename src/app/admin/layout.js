export const metadata = {
  title: "Admin — Odinaka Solar Tech",
  robots: { index: false, follow: false },
};

import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
