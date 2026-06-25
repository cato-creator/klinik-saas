import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Verifikasi sesi impersonasi DI HOST SUBDOMAIN klinik. Super admin memicu
// impersonateOwner (di apex) yang membuat magic-link token sekali-pakai lalu
// mengarahkan ke sini; di sini token di-verifyOtp sehingga cookie sesi owner
// ter-set pada host subdomain (cookie host-scoped → sesi super admin di apex
// tetap utuh). Token = kredensial (tak ada guard tambahan), sekali-pakai & singkat.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const nextRaw = searchParams.get("next") ?? "/owner/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : "/owner/dashboard";

  if (tokenHash) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth/login?error=impersonate`);
}
