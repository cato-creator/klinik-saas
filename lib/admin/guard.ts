// Guard: pastikan request datang dari super admin yang login.
// Dipakai di layout /admin dan di setiap server action sensitif.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string;
};

// Untuk Server Components / layout: redirect ke login bila bukan super admin.
export async function requireSuperAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/admin/login?error=forbidden");
  }

  return {
    id: user.id,
    email: profile.email ?? user.email ?? null,
    full_name: profile.full_name ?? "Super Admin",
  };
}

// Untuk Server Actions: lempar error (bukan redirect) bila bukan super admin.
export async function assertSuperAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Tidak terautentikasi.");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Akses ditolak: hanya super admin.");
  }
  return user.id;
}
