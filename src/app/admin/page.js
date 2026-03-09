import { createClient } from "@/lib/supabase/server";
import AdminLoginInline from "@/components/admin/AdminLogininline";
import AdminDashboardClient from "@/app/admin/AdminDashboard.client";

export const metadata = {
  title: "Admin — Odinaka Solar Tech",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return <AdminLoginInline />;

  const { data: admin, error: adminErr } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminErr || !admin) {
    return <AdminLoginInline errorText="Not authorized for admin access." />;
  }

  return <AdminDashboardClient />;
}
