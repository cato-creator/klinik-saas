import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight, NotebookPen, Flag, History, CheckCircle2, Circle, House, Activity } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { logMedicalAccess } from '@/lib/audit'
import { Badge } from '@/components/ui/badge'
import { PatientHeader } from '@/components/terapis/patient-header'
import { CaseTabs, type CaseTab } from '@/components/terapis/case-tabs'
import { CpptManager } from '@/components/terapis/cppt-manager'
import { FisioAnamnesisModule } from '@/components/terapis/anamnesis/fisio-anamnesis-module'
import { OkupasiAnamnesisModule } from '@/components/terapis/anamnesis/okupasi-anamnesis-module'
import { WicaraAnamnesisModule } from '@/components/terapis/anamnesis/wicara-anamnesis-module'
import { resolvePatientDiscipline, anamnesisKindFor, disciplineLabel, DISCIPLINES } from '@/lib/disciplines'
import { GoalsModule } from '@/components/terapis/goals-module'
import { ClinicalEdit } from '@/components/terapis/clinical-edit'
import { IdentityEdit } from '@/components/terapis/identity-edit'
import { HomeProgramEditor } from '@/components/terapis/home-program-editor'
import { HomeProgramImages } from '@/components/terapis/home-program-images'
import { SessionTreatments } from '@/components/terapis/session-treatments'
import { PrintButton } from '@/components/terapis/print-button'
import { formatDate, formatDatetime, formatRM, getBookingStatusLabel, getBookingStatusColor, isBookingConfirmed, calculateAge, isUnscheduledTime, formatTime } from '@/lib/utils'

interface Props {
  patientId: string
  role: string
  userId: string
  clinicId: string
  /** Bila diberikan, editor CPPT menargetkan booking ini (mis. dari Jadwal/Antrian). */
  focusBookingId?: string
  initialTab?: string
  backHref: string
  backLabel: string
}

export async function PatientCaseView({ patientId, role, userId, clinicId, focusBookingId, initialTab, backHref, backLabel }: Props) {
  const db = createServiceClient()
  const { data: patient } = await db.from('patients').select('*').eq('id', patientId).eq('clinic_id', clinicId).is('deleted_at', null).single()
  if (!patient) notFound()

  // Disiplin kini melekat PER KUNJUNGAN/ASESMEN (bukan per pasien), agar 1 pasien
  // (1 No.RM) bisa punya riwayat Fisio & OT sekaligus, masing-masing berlabel &
  // memakai form yang sesuai. `patientPrimary` jadi fallback untuk data lama.
  // Ambil identitas klinik (diisi owner di Pengaturan Landing) untuk KOP SURAT
  // pada rekap cetak: nama, logo, alamat, telp.
  const { data: clinicRow } = await db.from('clinics').select('clinic_type, name, logo_url, address, phone_number').eq('id', clinicId).single()
  const patientPrimary = resolvePatientDiscipline((patient as any).discipline, clinicRow?.clinic_type)

  // Audit AKSES rekam medis (§9.1): catat siapa membuka data medis pasien mana.
  // Tanpa isi medis di metadata — hanya jejak privasi.
  await logMedicalAccess({
    actorUserId: userId,
    actorRole: role,
    clinicId,
    action: 'soap.view',
    entityType: 'patient',
    patientId,
    metadata: focusBookingId ? { booking_id: focusBookingId } : undefined,
  })

  // Semua kunjungan pasien ini (lintas layanan). Terapis BOLEH melihat semua
  // (read-only utk layanan yang bukan miliknya); yang editable hanya kunjungannya.
  const bq = db
    .from('bookings')
    .select('*, service_type:service_types(name), therapist:therapists(user_id, signature_url, profile:users(full_name))')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .order('session_date', { ascending: false })

  const { data: therapist } = role === 'therapist'
    ? await db.from('therapists').select('id, discipline').eq('user_id', userId).eq('clinic_id', clinicId).single()
    : { data: null }

  if (role === 'therapist' && !therapist) redirect('/terapis/dashboard')

  const ownDiscipline = (therapist as any)?.discipline as string | null | undefined
  const bookings = (await bq).data ?? []

  const bookingIds = bookings.map((b) => b.id)
  const [notesRes, assessRes, goalsRes] = await Promise.all([
    bookingIds.length ? db.from('session_notes').select('*, therapist:therapists!therapist_id(signature_url, profile:users(full_name))').eq('clinic_id', clinicId).in('booking_id', bookingIds).is('deleted_at', null) : Promise.resolve({ data: [] as any[] }),
    db.from('assessments').select('*, therapist:therapists(profile:users(full_name))').eq('clinic_id', clinicId).eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
    db.from('treatment_goals').select('*, therapist:therapists(profile:users(full_name))').eq('clinic_id', clinicId).eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
  ])
  const notes = notesRes.data ?? []
  const assessments = assessRes.data ?? []
  const goals = goalsRes.data ?? []
  const noteByBooking = new Map(notes.map((n) => [n.booking_id, n]))
  const bookingById = new Map(bookings.map((b) => [b.id, b]))

  // Terapis PENULIS catatan (session_notes.therapist_id) — dipakai sebagai sumber
  // utama "diinput oleh", agar tiap CPPT menampilkan terapis yang benar-benar
  // membuatnya. Fallback ke terapis booking bila join kosong.
  const noteAuthorName = (n: any): string | undefined =>
    (n.therapist as any)?.profile?.full_name ??
    (bookingById.get(n.booking_id)?.therapist as any)?.profile?.full_name
  const noteAuthorSignature = (n: any): string | null =>
    (n.therapist as any)?.signature_url ??
    (bookingById.get(n.booking_id)?.therapist as any)?.signature_url ?? null

  const completed = bookings.filter((b) => b.status === 'completed').length

  // Disiplin efektif sebuah data (fallback ke tipe utama pasien bila kosong/lama).
  const discOf = (row: { discipline?: string | null; data?: any }): string => {
    if (row.discipline) return row.discipline
    if (row.data && (row.data as any).form_type === 'okupasi') return 'okupasi_terapi'
    if (row.data && (row.data as any).form_type === 'wicara') return 'terapi_wicara'
    return patientPrimary
  }

  // Kunjungan milik terapis ini (untuk SOAP yang bisa diedit). Admin/owner = semua.
  const isOwnBooking = (b: any) =>
    role !== 'therapist' || (therapist && b.therapist_id === (therapist as any).id)

  // Sesi yang dikerjakan: focusBookingId; selain itu utamakan kunjungan SENDIRI
  // (in_progress→confirmed) agar terapis hanya mengedit SOAP kunjungannya.
  const editable = bookings.filter(isOwnBooking)
  const workBooking = focusBookingId
    ? bookings.find((b) => b.id === focusBookingId) ?? null
    : editable.find((b) => b.status === 'in_progress') ?? editable.find((b) => b.status === 'confirmed') ?? null

  // ---- Konteks kunjungan untuk banner rekam medis ----
  // Layanan kunjungan yang dilihat (Fisio/OT). Bila pasien punya >1 penanganan pada
  // TANGGAL yang sama, tampilkan semuanya (mis. "Fisioterapi · Okupasi Terapi").
  const visitDateLabel = workBooking ? formatDate(workBooking.session_date) : undefined
  const visitDisciplines = workBooking
    ? Array.from(
        new Set(
          bookings
            .filter((b) => b.session_date === workBooking.session_date)
            .map((b) => discOf(b)),
        ),
      ).map((k) => disciplineLabel(k))
    : undefined
  // Kunjungan SUDAH selesai → mode histori: tampilkan "Selesai Pelayanan Poli: <tgl>, <jam>"
  // dan SEMBUNYIKAN tombol "Selesai Pelayanan" (ini riwayat, bukan pelayanan aktif).
  // Pakai waktu penyelesaian (completed_at); fallback ke tanggal/jam kunjungan utk data lama.
  const completedAtLabel =
    workBooking && workBooking.status === 'completed'
      ? (workBooking as any).completed_at
        ? formatDatetime((workBooking as any).completed_at)
        : `${formatDate(workBooking.session_date)}${!isUnscheduledTime(workBooking.session_time) ? `, ${formatTime(workBooking.session_time)} WIB` : ''}`
      : null
  // Tombol "Selesai Pelayanan" hanya untuk kunjungan AKTIF (belum selesai/dibatalkan).
  const activeCompleteBookingId =
    workBooking && workBooking.status !== 'completed' && workBooking.status !== 'cancelled'
      ? workBooking.id
      : undefined

  // Disiplin yang ditampilkan sebagai SEKSI di tab Asesmen: yang muncul di data
  // pasien + disiplin terapis sendiri (agar bisa menambah). Urut sesuai registry.
  const presentDisc = new Set<string>()
  bookings.forEach((b) => presentDisc.add(discOf(b)))
  assessments.forEach((a) => presentDisc.add(discOf(a)))
  goals.forEach((g) => presentDisc.add(discOf(g)))
  if (ownDiscipline) presentDisc.add(ownDiscipline)
  let sectionKeys = DISCIPLINES.map((d) => d.key).filter((k) => presentDisc.has(k))
  if (sectionKeys.length === 0) sectionKeys = [patientPrimary]
  // Label kunjungan/asesmen ditampilkan bila pasien memang lintas-layanan.
  const multiService = new Set(bookings.map(discOf)).size > 1 || sectionKeys.length > 1

  // Target Terapi & Home Program TIDAK boleh campur lintas layanan: terapis hanya
  // melihat/mengelola disiplinnya sendiri. Admin/owner melihat semua.
  const restrictByOwn = role === 'therapist' && !!ownDiscipline
  const visibleGoals = restrictByOwn ? goals.filter((g) => discOf(g) === ownDiscipline) : goals

  // ---- Identitas ---- (bisa diubah terapis/admin/owner, kecuali No. RM)
  const identitasTab = (
    <div className="space-y-4">
      <ClinicalEdit patientId={patientId} specialAlert={patient.special_alert ?? null} sessionPackage={patient.session_package ?? null} />
      <IdentityEdit
        patient={{
          id: patient.id,
          medical_record_no: patient.medical_record_no ?? null,
          full_name: patient.full_name,
          birth_date: patient.birth_date ?? null,
          gender: patient.gender ?? null,
          phone: patient.phone ?? null,
          guardian_name: patient.guardian_name ?? null,
          email: patient.email ?? null,
          notes: patient.notes ?? null,
        }}
      />
    </div>
  )

  // ---- Home Program ---- (ikut aturan: terapis hanya lihat disiplinnya sendiri)
  const homePrograms = notes
    .map((n) => ({ n, b: bookingById.get(n.booking_id) }))
    .filter((x) => x.b && (x.n.home_program || (x.n.home_program_images?.length ?? 0) > 0) && (!restrictByOwn || discOf(x.b!) === ownDiscipline))
    .sort((a, b) => (a.b!.session_date < b.b!.session_date ? 1 : -1))

  // Editor home program untuk sesi yang sedang dikerjakan (update kolom home_program
  // pada catatan terbaru booking ini, tanpa menyentuh S/O/A/P).
  const workNotes = workBooking
    ? notes.filter((n) => n.booking_id === workBooking.id).sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1))
    : []
  const latestWorkNote = workNotes[workNotes.length - 1]

  const programTab = (
    <div className="space-y-4">
      {workBooking && (
        <HomeProgramEditor
          bookingId={workBooking.id}
          noteId={latestWorkNote?.id}
          initial={latestWorkNote?.home_program ?? ''}
          initialImages={latestWorkNote?.home_program_images ?? []}
          dateLabel={formatDate(workBooking.session_date)}
        />
      )}

      <div>
        <h3 className="mb-2 text-sm font-bold text-gray-700">Riwayat Program Latihan</h3>
        {homePrograms.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada program latihan di rumah.</p>
        ) : (
          <div className="space-y-3">
            {homePrograms.map(({ n, b }) => {
              const therapistName = noteAuthorName(n) ?? 'Terapis'
              return (
                <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-teal-700">{formatDate(b!.session_date)}</p>
                    <p className="text-xs text-gray-400">{therapistName}</p>
                  </div>
                  {n.home_program && (
                    <div className="rounded-r-lg border-l-[3px] border-green-500 bg-green-50 px-4 py-2.5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-green-900">{n.home_program}</p>
                    </div>
                  )}
                  {(n.home_program_images?.length ?? 0) > 0 && (
                    <HomeProgramImages images={n.home_program_images} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // Rekap seluruh CPPT pasien untuk cetak (urut terbaru → terlama).
  const recapNotes = notes
    .map((n) => ({ n, b: bookingById.get(n.booking_id) }))
    .filter((x) => x.b && (x.n.subjective || x.n.objective || x.n.assessment || x.n.plan || x.n.home_program))
    .sort((a, b) => {
      if (a.b!.session_date !== b.b!.session_date) return a.b!.session_date < b.b!.session_date ? 1 : -1
      return (a.n.created_at ?? '') < (b.n.created_at ?? '') ? 1 : -1
    })
    .map(({ n, b }, i, arr) => ({
      key: n.id,
      cpptNo: arr.length - i,
      date: formatDate(b!.session_date),
      therapistName: noteAuthorName(n) ?? 'Terapis',
      signatureUrl: noteAuthorSignature(n),
      note: n,
    }))

  // Catatan untuk editor sesi aktif + ringkasan "sesi sebelumnya".
  const activeNotes = workBooking
    ? notes
        .filter((n) => n.booking_id === workBooking.id)
        .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1))
        .map((n) => ({
          id: n.id,
          subjective: n.subjective,
          objective: n.objective,
          assessment: n.assessment,
          plan: n.plan,
          home_program: n.home_program,
          next_session: n.next_session,
          therapistName: noteAuthorName(n),
          signatureUrl: noteAuthorSignature(n),
        }))
    : []

  // Seluruh CPPT pasien (semua kunjungan) untuk popup "Copy CPPT", urut terbaru → terlama.
  const allCpptNotes = notes
    .filter((n) => n.subjective || n.objective || n.assessment || n.plan || n.home_program)
    .map((n) => {
      const b = bookingById.get(n.booking_id)
      return {
        id: n.id,
        date: b?.session_date ?? n.created_at,
        therapistName: noteAuthorName(n),
        subjective: n.subjective ?? '',
        objective: n.objective ?? '',
        assessment: n.assessment ?? '',
        plan: n.plan ?? '',
        home_program: n.home_program ?? '',
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  // Sesi sebelumnya (untuk ringkasan di sidebar) = semua CPPT kecuali sesi yang sedang dikerjakan.
  const activeNoteIds = new Set(activeNotes.map((n) => n.id))
  const previousForEditor = allCpptNotes.filter((n) => !activeNoteIds.has(n.id))

  const cpptTab = (
    <div className="space-y-5">
      {workBooking ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex flex-wrap items-center gap-2 font-bold text-gray-900">
                <NotebookPen className="h-4 w-4 text-teal-600" /> SOAP — kunjungan {formatDate(workBooking.session_date)}
                {multiService && <DiscBadge k={discOf(workBooking)} />}
              </h3>
              <Badge variant={getBookingStatusColor(workBooking.status, (workBooking as any).payment_status) as any}>{getBookingStatusLabel(workBooking.status, (workBooking as any).payment_status)}</Badge>
            </div>
            <CpptManager
              bookingId={workBooking.id}
              locked={!isBookingConfirmed(workBooking.status, (workBooking as any).payment_status)}
              canComplete={workBooking.status !== 'completed' && workBooking.status !== 'cancelled'}
              notes={activeNotes}
              therapistName={(workBooking.therapist as any)?.profile?.full_name}
              signatureUrl={(workBooking.therapist as any)?.signature_url}
              dateLabel={formatDate(workBooking.session_date)}
              timeLabel={!isUnscheduledTime(workBooking.session_time) ? formatTime(workBooking.session_time) : undefined}
              previousNotes={allCpptNotes}
            />
          </div>

          <div className="space-y-4">
            {/* Tampilan tindakan terapi (read-only) — dipilih di tab Tindakan. */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                <Activity className="h-4 w-4 text-teal-600" /> Tindakan Terapi
              </h4>
              {((workBooking as any).modalities?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {((workBooking as any).modalities as string[]).map((m) => (
                    <span key={m} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{m}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Belum ada tindakan. Pilih di tab Tindakan.</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                <Flag className="h-4 w-4 text-teal-600" /> Target Terapi
              </h4>
              {visibleGoals.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada target. Tambah di tab Target Terapi.</p>
              ) : (
                <ul className="space-y-2">
                  {visibleGoals.slice(0, 5).map((g: any) => (
                    <li key={g.id} className="flex items-start gap-2 text-sm">
                      {g.status === 'achieved'
                        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />}
                      <span className={g.status === 'achieved' ? 'text-gray-400 line-through' : 'text-gray-700'}>{g.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                <History className="h-4 w-4 text-teal-600" /> Sesi Sebelumnya
              </h4>
              {previousForEditor.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada sesi sebelumnya.</p>
              ) : (
                <div className="space-y-3 border-l-2 border-gray-100 pl-3">
                  {previousForEditor.slice(0, 3).map((n) => (
                    <div key={n.id}>
                      <p className="text-xs font-semibold text-teal-700">{formatDate(n.date)}{n.therapistName ? ` · ${n.therapistName}` : ''}</p>
                      <p className="line-clamp-2 text-xs text-gray-600">{n.objective || n.assessment || n.subjective || n.plan || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-500">
          Tidak ada sesi yang dipilih. Buka sesi dari Jadwal Hari Ini atau dari tab Riwayat Kunjungan.
        </p>
      )}
    </div>
  )

  // ---- Riwayat Kunjungan ----
  const riwayatTab = bookings.length === 0 ? (
    <p className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">Belum ada riwayat kunjungan.</p>
  ) : (
    <div className="space-y-3">
      {bookings.map((b, i) => {
        const note = noteByBooking.get(b.id) as any
        const therapistName = (b.therapist as any)?.profile?.full_name ?? 'Terapis'
        const active = b.status === 'in_progress'
        const canOpen = isOwnBooking(b) // terapis: hanya kunjungan sendiri yang bisa dibuka/diedit
        const cls = `group flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm sm:gap-4 sm:p-4 ${active ? 'border-teal-300 ring-2 ring-teal-500/20' : 'border-gray-100'} ${canOpen ? 'transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md' : ''}`
        const inner = (
          <>
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <span className="text-lg font-bold leading-none">{formatDate(b.session_date, 'd')}</span>
              <span className="text-[10px] font-semibold uppercase">{formatDate(b.session_date, 'MMM')}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">
                  <span className="mr-2 text-xs font-bold text-teal-600">Kunjungan {bookings.length - i}</span>
                  {formatDate(b.session_date)}
                </p>
                {multiService && <DiscBadge k={discOf(b)} />}
                {active && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700">Sesi aktif</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {(b.service_type as any)?.name}
                {!isUnscheduledTime(b.session_time) && ` · ${formatTime(b.session_time)}`}
                {` · ${therapistName}`}
              </p>
              {note?.assessment && <p className="mt-1 line-clamp-1 text-xs text-gray-600"><span className="font-semibold text-amber-600">A:</span> {note.assessment}</p>}
              {((b as any).modalities?.length ?? 0) > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {((b as any).modalities as string[]).slice(0, 6).map((m) => (
                    <span key={m} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">{m}</span>
                  ))}
                </div>
              )}
            </div>
            <Badge variant={getBookingStatusColor(b.status, (b as any).payment_status) as any}>{getBookingStatusLabel(b.status, (b as any).payment_status)}</Badge>
            {canOpen && <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-teal-500" />}
          </>
        )
        // Kunjungan layanan lain (bukan milik terapis ini) = read-only: tampilkan
        // SOAP-nya inline (boleh dilihat) tanpa tautan edit.
        return canOpen ? (
          <Link key={b.id} href={`/terapis/catatan/${b.id}`} className={cls}>{inner}</Link>
        ) : (
          <div key={b.id}>
            <div className={cls}>{inner}</div>
            {note && (note.subjective || note.objective || note.assessment || note.plan) && (
              <div className="mt-1 ml-2 space-y-0.5 rounded-r-lg border-l-2 border-violet-200 bg-violet-50/40 px-3 py-2 text-xs text-gray-600">
                {note.subjective && <p><span className="font-semibold text-gray-500">S:</span> {note.subjective}</p>}
                {note.objective && <p><span className="font-semibold text-gray-500">O:</span> {note.objective}</p>}
                {note.assessment && <p><span className="font-semibold text-amber-600">A:</span> {note.assessment}</p>}
                {note.plan && <p><span className="font-semibold text-gray-500">P:</span> {note.plan}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // ---- Tindakan = Target Terapi + Home Program (digabung) ----
  const tindakanTab = (
    <div className="space-y-6">
      {workBooking && (
        <SessionTreatments
          bookingId={workBooking.id}
          discipline={discOf(workBooking)}
          initial={(workBooking as any).modalities ?? []}
          locked={!isBookingConfirmed(workBooking.status, (workBooking as any).payment_status)}
        />
      )}
      <GoalsModule patientId={patientId} items={visibleGoals as any} />
      <div className="border-t border-gray-100 pt-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
          <House className="h-4 w-4 text-teal-600" /> Home Program
        </h2>
        {programTab}
      </div>
    </div>
  )

  // Render modul anamnesis sesuai jenis disiplin.
  const renderAnamnesisModule = (key: string, sectionItems: any[], readOnly: boolean) => {
    const kind = anamnesisKindFor(key)
    if (kind === 'okupasi') return <OkupasiAnamnesisModule patientId={patientId} items={sectionItems} readOnly={readOnly} discipline={key} />
    if (kind === 'wicara') return <WicaraAnamnesisModule patientId={patientId} items={sectionItems} readOnly={readOnly} discipline={key} />
    return <FisioAnamnesisModule patientId={patientId} items={sectionItems} readOnly={readOnly} discipline={key} />
  }

  // Tab Asesmen: satu seksi per layanan bila pasien lintas-disiplin. Terapis hanya
  // bisa MENGISI di layanannya sendiri; layanan lain ditampilkan read-only.
  const roFor = (k: string) => role === 'therapist' && !!ownDiscipline && k !== ownDiscipline
  const asesmenContent = sectionKeys.length === 1
    ? renderAnamnesisModule(sectionKeys[0], assessments.filter((a) => discOf(a) === sectionKeys[0]), roFor(sectionKeys[0]))
    : (
      <div className="space-y-8">
        {sectionKeys.map((k) => (
          <section key={k}>
            <div className="mb-2 flex items-center gap-2">
              <DiscBadge k={k} />
              {roFor(k) && <span className="text-xs text-gray-400">— hanya lihat</span>}
            </div>
            {renderAnamnesisModule(k, assessments.filter((a) => discOf(a) === k), roFor(k))}
          </section>
        ))}
      </div>
    )

  const tabs: CaseTab[] = [
    { id: 'identitas', label: 'Identitas', content: identitasTab },
    {
      id: 'asesmen',
      label: sectionKeys.length > 1
        ? 'Anamnesis / Asesmen'
        : (anamnesisKindFor(sectionKeys[0]) === 'okupasi' ? 'Asesmen OT'
          : anamnesisKindFor(sectionKeys[0]) === 'wicara' ? 'Asesmen TW'
            : 'Anamnesis'),
      badge: assessments.length,
      content: asesmenContent,
    },
    { id: 'cppt', label: 'SOAP', badge: activeNotes.length || undefined, content: cpptTab },
    { id: 'tindakan', label: 'Tindakan', badge: (visibleGoals.length + homePrograms.length) || undefined, content: tindakanTab },
    { id: 'riwayat', label: 'Riwayat Kunjungan', badge: bookings.length, content: riwayatTab },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-teal-600">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <PrintButton label="Cetak Rekap" />
      </div>

      <PatientHeader
        patient={patient as any}
        completed={completed}
        visitDisciplines={visitDisciplines}
        visitDateLabel={visitDateLabel}
        completedAtLabel={completedAtLabel}
        completeBookingId={activeCompleteBookingId}
      />

      <CaseTabs tabs={tabs} initial={initialTab} />

      {/* Rekap untuk cetak — disembunyikan di layar, tampil saat print */}
      <style>{`
        #cppt-recap { display: none; }
        @media print {
          body * { visibility: hidden; }
          #cppt-recap, #cppt-recap * { visibility: visible; }
          #cppt-recap {
            display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 24px;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
        }
      `}</style>
      <div id="cppt-recap" className="text-sm text-gray-900">
        {/* Kop surat — logo, nama, & alamat klinik (dari Pengaturan Landing owner).
            Hanya tampil di halaman 1 (header dokumen, tidak diulang per halaman). */}
        <div className="mb-5 flex items-center gap-4 border-b-2 border-teal-600 pb-4">
          {clinicRow?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinicRow.logo_url} alt={clinicRow?.name ?? 'Logo Klinik'} className="h-20 w-20 shrink-0 object-contain" />
          )}
          <div className="min-w-0">
            <p className="text-2xl font-extrabold leading-tight text-teal-700">{clinicRow?.name ?? 'Klinik'}</p>
            {clinicRow?.address && <p className="mt-1 text-xs leading-snug text-gray-600">{clinicRow.address}</p>}
            {clinicRow?.phone_number && <p className="text-xs leading-snug text-gray-600">Telp: {clinicRow.phone_number}</p>}
          </div>
        </div>

        <h1 className="text-xl font-bold">Rekap Rekam Medis — {patient.full_name}</h1>
        <p className="mt-1 text-gray-600">
          No. RM: {formatRM(patient.medical_record_no)}
          {patient.birth_date && ` · ${calculateAge(patient.birth_date)} thn`}
          {patient.gender && ` · ${patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}`}
        </p>
        {patient.special_alert && <p className="mt-2 font-semibold text-amber-700">⚠ Perhatian Khusus: {patient.special_alert}</p>}
        {patient.allergies && <p className="mt-1">Alergi: {patient.allergies}</p>}

        {visibleGoals.length > 0 && (
          <div className="mt-4">
            <h2 className="font-bold">Target Terapi</h2>
            <ul className="mt-1 list-disc pl-5">
              {visibleGoals.map((g: any) => (
                <li key={g.id}>{g.status === 'achieved' ? '☑' : '☐'} {g.description}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <h2 className="font-bold">Catatan Perkembangan (SOAP)</h2>
          {recapNotes.length === 0 ? (
            <p className="mt-1 text-gray-500">Belum ada SOAP.</p>
          ) : (
            recapNotes.map((e) => (
              <div key={e.key} className="mt-3 border-t pt-2">
                <p className="font-semibold">SOAP {e.cpptNo} — {e.date} · {e.therapistName}</p>
                {e.note?.subjective && <p><b>S:</b> {e.note.subjective}</p>}
                {e.note?.objective && <p><b>O:</b> {e.note.objective}</p>}
                {e.note?.assessment && <p><b>A:</b> {e.note.assessment}</p>}
                {e.note?.plan && <p><b>P:</b> {e.note.plan}</p>}
                {e.note?.home_program && <p><b>Program rumah:</b> {e.note.home_program}</p>}
                <div className="mt-3 text-right">
                  {e.signatureUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.signatureUrl} alt={`Tanda tangan ${e.therapistName}`} className="ml-auto h-14 object-contain" />
                  )}
                  <p className="text-xs text-gray-600">{e.therapistName}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Label layanan (Fisio/OT) untuk membedakan kunjungan & asesmen lintas disiplin.
function DiscBadge({ k }: { k: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
      {disciplineLabel(k)}
    </span>
  )
}
