import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requireTenantUser } from '@/lib/tenant/auth'
import { TherapistShell, type ShellNavItem } from '@/components/terapis/therapist-shell'
import { LayoutDashboard, Calendar, FileText, Settings, LayoutGrid, FileSignature } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard Terapis' }

const iconCls = 'h-4 w-4'
const navItems: ShellNavItem[] = [
  { href: '/terapis/overview', label: 'Overview', icon: <LayoutGrid className={iconCls} />, accent: 'teal' },
  // Halaman catatan sesi (mengisi data pasien hari itu) dibuka dari Jadwal Hari Ini,
  // jadi menu ini tetap aktif selama berada di /terapis/catatan/*.
  { href: '/terapis/dashboard', label: 'Jadwal Hari Ini', icon: <LayoutDashboard className={iconCls} />, accent: 'sky', matchPrefixes: ['/terapis/catatan'] },
  { href: '/terapis/jadwal', label: 'Kalender Jadwal', icon: <Calendar className={iconCls} />, accent: 'violet' },
  { href: '/terapis/pasien', label: 'Rekam Medis', icon: <FileText className={iconCls} />, accent: 'amber' },
  { href: '/terapis/dokumen', label: 'Surat & Invoice', icon: <FileSignature className={iconCls} />, accent: 'violet' },
  { href: '/terapis/pengaturan', label: 'Pengaturan', icon: <Settings className={iconCls} />, accent: 'rose' },
]

export default async function TerapisLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenantUser(['therapist', 'admin', 'owner'])

  // Foto terapis untuk menggantikan logo di header sidebar.
  const supabase = await createClient()
  const { data: therapist } = await supabase
    .from('therapists')
    .select('photo_url')
    .eq('user_id', ctx.userId)
    .maybeSingle()

  return (
    <TherapistShell
      navItems={navItems}
      clinicName={ctx.clinicName}
      fullName={ctx.fullName}
      avatarUrl={therapist?.photo_url ?? null}
    >
      {children}
    </TherapistShell>
  )
}
