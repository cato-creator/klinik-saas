import { createServiceClient } from '@/lib/supabase/server'
import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

/**
 * Pengaturan profil terapis (self-service): nama, foto profil, tanda tangan.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await apiTenant(['therapist', 'admin', 'owner'])
    if (!auth.ok) return auth.res
    const clinicId = auth.clinicId
    const userId = auth.userId

    const db = createServiceClient()

    // Terapis hanya boleh mengubah record miliknya sendiri.
    const { data: therapist } = await db
      .from('therapists')
      .select('id, photo_url, signature_url')
      .eq('user_id', userId)
      .eq('clinic_id', clinicId)
      .maybeSingle()
    if (!therapist) {
      return NextResponse.json({ error: 'Data terapis tidak ditemukan untuk akun ini' }, { status: 404 })
    }

    const formData = await request.formData()
    const fullName = (formData.get('full_name') as string | null)?.trim()
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: 'Nama minimal 2 karakter' }, { status: 400 })
    }

    const photo = formData.get('photo') as File | null
    const signature = formData.get('signature') as File | null

    // Helper upload ke Cloudinary (path diawali clinic_id utk isolasi).
    async function upload(file: File, folder: string): Promise<string | null> {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error('Format harus JPG, PNG, atau WebP')
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Ukuran maksimal 2MB')
      }
      return uploadImageToCloudinary(file, { folder: `${clinicId}/${folder}` })
    }

    const update: Record<string, string> = {}
    try {
      if (photo && photo.size > 0) update.photo_url = (await upload(photo, 'therapists'))!
      if (signature && signature.size > 0) update.signature_url = (await upload(signature, 'signatures'))!
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? 'Gagal upload berkas' }, { status: 400 })
    }

    if (Object.keys(update).length > 0) {
      await db.from('therapists').update(update).eq('id', therapist.id)
    }
    // Nama disimpan di users → konsisten dengan landing page & dashboard.
    await db.from('users').update({ full_name: fullName }).eq('id', userId)

    return NextResponse.json({
      success: true,
      photo_url: update.photo_url ?? therapist.photo_url,
      signature_url: update.signature_url ?? therapist.signature_url,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
