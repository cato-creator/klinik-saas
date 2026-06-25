import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { buildKeuanganWorkbook } from '@/lib/laporan-keuangan'

// Export laporan keuangan klinik milik owner. Logika workbook ada di
// lib/laporan-keuangan.ts (dipakai bersama route super admin).
export async function GET() {
  const auth = await apiTenant(['owner'])
  if (!auth.ok) return auth.res

  const spec = await buildKeuanganWorkbook(createServiceClient(), auth.clinicId)
  // Browser merakit .xlsx dari spec (lib/xlsx-client.ts).
  return NextResponse.json({
    filename: `Laporan-Keuangan-Klinik-${new Date().toISOString().slice(0, 10)}.xlsx`,
    spec,
  })
}
