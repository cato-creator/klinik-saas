import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiSuperAdmin } from '@/lib/admin/api-guard'
import { logMedicalAccess } from '@/lib/audit'
import { sStr as S, sNum as N, type XlsxCell as Cell, type WorkbookSpec } from '@/lib/xlsx-spec'

// Export DATA PASIEN + REKAM MEDIS LENGKAP satu klinik (super admin), termasuk
// klinik suspended/expired — untuk serah-terima data bila owner memintanya.
// ⚠️ Menembus default privasi §9.1 (super admin biasanya tak lihat isi medis),
// jadi: WAJIB lewat service role di server, butuh ALASAN, dan SELALU dicatat ke
// audit_logs (logMedicalAccess) sebagai jejak akses rekam medis.
// Multi-sheet: Identitas, Kunjungan, SOAP (catatan), Anamnesis/Asesmen.
// Server kirim spec JSON; browser merakit .xlsx (lib/xlsx-client.ts).

function dstr(d: string | null | undefined): string {
  if (!d) return ''
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  if (!y || !m || !day) return s
  return `${day}/${m}/${y}`
}
function rmStr(v: string | null | undefined): string {
  const digits = String(v ?? '').replace(/\D/g, '')
  return digits ? digits.padStart(6, '0') : ''
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const size = 1000
  const all: T[] = []
  for (let from = 0; ; from += size) {
    const { data } = await build(from, from + size - 1)
    if (data?.length) all.push(...data)
    if (!data || data.length < size) break
  }
  return all
}

const schema = z.object({
  clinic_id: z.string().uuid(),
  reason: z.string().trim().min(3, 'Alasan minimal 3 karakter').max(300),
})

export async function POST(request: NextRequest) {
  const auth = await apiSuperAdmin()
  if (!auth.ok) return auth.res

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, { status: 400 })
  }
  const { clinic_id: clinicId, reason } = parsed.data

  const db = createAdminClient()
  const { data: clinic } = await db.from('clinics').select('id, name').eq('id', clinicId).maybeSingle()
  if (!clinic) return NextResponse.json({ error: 'Klinik tidak ditemukan' }, { status: 404 })

  const [patients, bookings, notes, assessments] = await Promise.all([
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from('patients')
        .select('id, medical_record_no, full_name, gender, birth_date, phone, email, guardian_name, diagnosis, allergies, special_alert, notes, source, deleted_at, created_at')
        .eq('clinic_id', clinicId).order('medical_record_no', { ascending: true }).range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from('bookings')
        .select('patient_id, booking_code, session_date, session_time, status, amount, service_type:service_types(name), therapist:therapists(user:users(full_name))')
        .eq('clinic_id', clinicId).order('session_date', { ascending: true }).range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from('session_notes')
        .select('patient_id, created_at, subjective, objective, assessment, plan, home_program, deleted_at')
        .eq('clinic_id', clinicId).is('deleted_at', null).order('created_at', { ascending: true }).range(f, t)),
    fetchAll<Record<string, unknown>>((f, t) =>
      db.from('assessments')
        .select('patient_id, created_at, chief_complaint, history, physical_exam, rom, pain_scale, notes, data')
        .eq('clinic_id', clinicId).order('created_at', { ascending: true }).range(f, t)),
  ])

  // Peta pasien → {rm, nama} untuk melabeli baris medis.
  const pmap = new Map<string, { rm: string; name: string }>()
  patients.forEach((p) => pmap.set(p.id as string, {
    rm: rmStr(p.medical_record_no as string),
    name: (p.full_name as string) ?? '',
  }))
  const lbl = (pid: unknown) => pmap.get(pid as string) ?? { rm: '', name: '' }

  const sheets: WorkbookSpec['sheets'] = []

  // ── Sheet 1: Identitas ──
  const idHead = ['No', 'No. RM', 'Nama', 'JK', 'Tgl Lahir', 'No. HP', 'Email', 'Wali', 'Diagnosa', 'Alergi', 'Perhatian Khusus', 'Catatan', 'Sumber', 'Status Data', 'Terdaftar']
  const idRows: Cell[][] = [idHead.map(S)]
  patients.forEach((p, i) => {
    idRows.push([
      N(i + 1), S(rmStr(p.medical_record_no as string)), S((p.full_name as string) ?? ''),
      S(p.gender === 'L' ? 'L' : p.gender === 'P' ? 'P' : ''), S(dstr(p.birth_date as string)),
      S((p.phone as string) ?? ''), S((p.email as string) ?? ''), S((p.guardian_name as string) ?? ''),
      S((p.diagnosis as string) ?? ''), S((p.allergies as string) ?? ''), S((p.special_alert as string) ?? ''),
      S((p.notes as string) ?? ''), S(p.source === 'manual_admin' ? 'Input admin' : 'Booking online'),
      S(p.deleted_at ? 'Diarsipkan' : 'Aktif'), S(dstr(p.created_at as string)),
    ])
  })
  sheets.push({ name: 'Identitas', rows: idRows, cols: [
    { wch: 5 }, { wch: 10 }, { wch: 24 }, { wch: 5 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 18 },
    { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ] })

  // ── Sheet 2: Kunjungan ──
  const kHead = ['No', 'No. RM', 'Nama', 'Kode', 'Tanggal', 'Jam', 'Status', 'Layanan', 'Terapis', 'Tarif']
  const kRows: Cell[][] = [kHead.map(S)]
  bookings.forEach((b, i) => {
    const l = lbl(b.patient_id)
    const svc = b.service_type as { name?: string } | null
    const ther = b.therapist as { user?: { full_name?: string } } | null
    kRows.push([
      N(i + 1), S(l.rm), S(l.name), S((b.booking_code as string) ?? ''),
      S(dstr(b.session_date as string)), S(String(b.session_time ?? '').slice(0, 5)),
      S((b.status as string) ?? ''), S(svc?.name ?? ''), S(ther?.user?.full_name ?? ''),
      N(Number(b.amount ?? 0)),
    ])
  })
  sheets.push({ name: 'Kunjungan', rows: kRows, cols: [
    { wch: 5 }, { wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
  ] })

  // ── Sheet 3: SOAP (catatan) ──
  const sHead = ['No', 'No. RM', 'Nama', 'Tanggal', 'S (Subjektif)', 'O (Objektif)', 'A (Asesmen)', 'P (Plan)', 'Home Program']
  const sRows: Cell[][] = [sHead.map(S)]
  notes.forEach((n, i) => {
    const l = lbl(n.patient_id)
    sRows.push([
      N(i + 1), S(l.rm), S(l.name), S(dstr(n.created_at as string)),
      S((n.subjective as string) ?? ''), S((n.objective as string) ?? ''),
      S((n.assessment as string) ?? ''), S((n.plan as string) ?? ''), S((n.home_program as string) ?? ''),
    ])
  })
  sheets.push({ name: 'SOAP', rows: sRows, cols: [
    { wch: 5 }, { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 36 }, { wch: 36 }, { wch: 36 }, { wch: 36 }, { wch: 36 },
  ] })

  // ── Sheet 4: Anamnesis / Asesmen ──
  const aHead = ['No', 'No. RM', 'Nama', 'Tanggal', 'Keluhan Utama', 'Riwayat', 'Pemeriksaan Fisik', 'ROM', 'Skala Nyeri', 'Catatan', 'Data Tambahan (JSON)']
  const aRows: Cell[][] = [aHead.map(S)]
  assessments.forEach((a, i) => {
    const l = lbl(a.patient_id)
    let extra = ''
    if (a.data != null) {
      try { extra = JSON.stringify(a.data) } catch { extra = '' }
    }
    aRows.push([
      N(i + 1), S(l.rm), S(l.name), S(dstr(a.created_at as string)),
      S((a.chief_complaint as string) ?? ''), S((a.history as string) ?? ''),
      S((a.physical_exam as string) ?? ''), S((a.rom as string) ?? ''),
      a.pain_scale != null ? N(Number(a.pain_scale)) : S(''), S((a.notes as string) ?? ''), S(extra),
    ])
  })
  sheets.push({ name: 'Anamnesis', rows: aRows, cols: [
    { wch: 5 }, { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 28 }, { wch: 50 },
  ] })

  // Audit: jejak akses rekam medis lintas klinik oleh super admin.
  await logMedicalAccess({
    actorUserId: auth.userId,
    actorRole: 'super_admin',
    clinicId,
    action: 'patient.export_full',
    entityType: 'patient',
    metadata: {
      reason,
      patient_count: patients.length,
      note_count: notes.length,
      assessment_count: assessments.length,
    },
  })

  const safeName = (clinic.name as string).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'Klinik'
  return NextResponse.json({
    filename: `Data-Pasien-${safeName}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    spec: { sheets },
  })
}
