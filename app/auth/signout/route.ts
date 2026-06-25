import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Redirect relatif ke origin request agar tidak bergantung pada
// NEXT_PUBLIC_APP_URL (yang bisa mengandung BOM → new URL() throw → 500).
async function handle(request: NextRequest) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Abaikan — tetap arahkan ke login.
  }
  return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 })
}

export async function POST(request: NextRequest) {
  return handle(request)
}

// Dukung akses langsung via GET (mis. mengetik URL) supaya tidak 405/500.
export async function GET(request: NextRequest) {
  return handle(request)
}
