// src/app/admin/page.js
import { createClient } from "@/lib/supabase/server";
import AdminLoginInline from "@/components/admin/AdminLogininline";
import AdminDashboardClient from "@/app/admin/AdminDashboard.client";

export const metadata = {
  title: "Admin — Odinaka Solar Tech",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();

  const startUser = performance.now();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  console.log(
    `[SUPABASE ${Math.round(performance.now() - startUser)}ms] auth.getUser`,
  );
  console.log(user?.id);

  if (error || !user) return <AdminLoginInline />;

  const startAdmin = performance.now();
  const { data: admin, error: adminErr } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log(
    `[SUPABASE ${Math.round(performance.now() - startAdmin)}ms] app_admins.select`,
  );

  if (adminErr || !admin) {
    return <AdminLoginInline errorText="Not authorized for admin access." />;
  }

  // Server verified => render SPA dashboard
  return <AdminDashboardClient />;
}
