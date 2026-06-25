// Helper middleware Supabase: refresh sesi (wajib di App Router) + proteksi /admin
// + resolusi subdomain tenant (inject header x-clinic-subdomain).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { subdomainFromHost, isCustomDomainCandidate } from "@/lib/tenant/host";
import { resolveCustomDomainSubdomain, customDomainForSubdomain } from "@/lib/tenant/domains";

// Full canonical: SEMUA halaman (landing, booking, auth, dashboard) di subdomain
// bawaan dialihkan ke custom domain klinik bila klinik punya custom domain
// terverifikasi. Hanya path infrastruktur (/_next, /api) dikecualikan agar
// aset & data-fetch tidak rusak.
//
// PENTING — pelajaran dari insiden 2026-06-21: pakai **307 (sementara)**, BUKAN
// 308 (permanen). 308 di-cache keras browser; bila custom domain sempat bermasalah,
// owner bisa terkunci permanen. 307 selalu re-evaluasi ke server → pulih sendiri.
// Kill-switch darurat: set env DISABLE_CANONICAL_REDIRECT=true untuk mematikan
// semua canonical redirect tanpa deploy ulang kode.
const CANONICAL_DISABLED =
  (process.env.DISABLE_CANONICAL_REDIRECT ?? "").trim().toLowerCase() === "true";

const REDIRECT_SKIP_PREFIXES = ["/_next", "/api"];
function shouldCanonicalize(path: string): boolean {
  return !REDIRECT_SKIP_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── MODE SATU-KLINIK (self-hosted) ──
  // Bila SELF_HOSTED_CLINIC_SUBDOMAIN diset, instance ini = SATU klinik berdiri
  // sendiri (produk bayar-sekali). App SELALU "jadi" klinik itu apa pun host-nya
  // (root domain langsung tampil landing klinik), dan area platform (super admin,
  // affiliator, signup) DIBLOKIR — tak ada jejak platform sama sekali.
  const selfHostedSub = (process.env.SELF_HOSTED_CLINIC_SUBDOMAIN ?? "").trim().toLowerCase();
  const isSelfHosted = !!selfHostedSub;

  // Deteksi subdomain klinik dari host, lalu teruskan sebagai header request
  // supaya bisa dibaca server components (booking publik, landing klinik).
  const host = request.headers.get("host");
  let subdomain: string | null;

  if (isSelfHosted) {
    subdomain = selfHostedSub;
    // Blokir area khusus platform → arahkan ke beranda klinik.
    if (path.startsWith("/admin") || path.startsWith("/affiliate") || path.startsWith("/daftar")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } else {
    const platformSub = subdomainFromHost(host); // non-null HANYA di *.ROOT_DOMAIN
    subdomain = platformSub;
    // Custom domain (tier premium): bila host bukan subdomain platform tapi
    // kandidat domain milik klinik, resolve ke subdomain kliniknya via tabel
    // `domains`. Downstream lalu bekerja persis seperti diakses lewat subdomain.
    if (!subdomain && isCustomDomainCandidate(host)) {
      subdomain = await resolveCustomDomainSubdomain(host);
    }

    // Canonical penuh (SEMUA halaman kecuali infra) dengan 307 sementara. Bisa
    // dimatikan darurat via env DISABLE_CANONICAL_REDIRECT=true. (Tidak berlaku
    // di mode self-hosted — domain klinik sudah final.)
    if (!CANONICAL_DISABLED && platformSub && shouldCanonicalize(path)) {
      const custom = await customDomainForSubdomain(platformSub);
      if (custom) {
        const target = request.nextUrl.clone();
        target.protocol = "https:";
        target.host = custom;
        target.port = "";
        return NextResponse.redirect(target, 307);
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (subdomain) requestHeaders.set("x-clinic-subdomain", subdomain);
  else requestHeaders.delete("x-clinic-subdomain");

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // PENTING: jangan jalankan logika apa pun di antara createServerClient dan getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminArea = path.startsWith("/admin");
  const isAffiliateArea = path.startsWith("/affiliate");
  const isLoginPage = path === "/admin/login";

  // Super admin & affiliator = level platform → hanya di domain utama. Di subdomain
  // klinik, /admin & /affiliate dialihkan ke domain utama agar tidak membingungkan.
  if (subdomain && (isAdminArea || isAffiliateArea)) {
    const url = request.nextUrl.clone();
    url.host = ROOT_HOST(request);
    return NextResponse.redirect(url);
  }

  // Belum login & mencoba akses /admin (selain halaman login) -> ke login.
  if (isAdminArea && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // CATATAN: halaman /admin/login SENGAJA selalu bisa diakses walau ada sesi,
  // agar user non-super-admin tidak terjebak loop. Verifikasi role di layout /admin.

  return response;
}

// Host domain utama (tanpa subdomain) untuk redirect.
function ROOT_HOST(request: NextRequest): string {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").trim().toLowerCase();
  if (root) return root;
  // fallback: pakai host apa adanya.
  return request.headers.get("host") ?? "";
}
