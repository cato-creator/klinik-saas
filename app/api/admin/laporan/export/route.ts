import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiSuperAdmin } from '@/lib/admin/api-guard'
import { buildKeuanganWorkbook } from '@/lib/laporan-keuangan'
import { writeAudit } from '@/lib/audit'

// Export laporan keuangan klinik MANA PUN (super admin), termasuk klinik
// suspended/expired. Service role + guard super admin. Dicatat ke audit_logs.
export async function GET(request: NextRequest) {
  const auth = await apiSuperAdmin()
  if (!auth.ok) return auth.res

  const clinicId = request.nextUrl.searchParams.get('clinic_id')
  if (!clinicId) {
    return NextResponse.json({ error: 'clinic_id wajib' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: clinic } = await db
    .from('clinics')
    .select('id, name')
    .eq('id', clinicId)
    .maybeSingle()
  if (!clinic) {
    return NextResponse.json({ error: 'Klinik tidak ditemukan' }, { status: 404 })
  }

  const spec = await buildKeuanganWorkbook(db, clinicId)

  await writeAudit({
    actorUserId: auth.userId,
    actorRole: 'super_admin',
    clinicId,
    action: 'clinic.export_finance',
    entityType: 'clinic',
    entityId: clinicId,
  })

  const safeName = (clinic.name as string).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'Klinik'
  // Browser yang merakit .xlsx dari spec (lib/xlsx-client.ts) supaya `xlsx` tidak
  // ikut ke bundle Worker.
  return NextResponse.json({
    filename: `Laporan-Keuangan-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    spec,
  })
}
