import { apiTenant } from '@/lib/tenant/api'
import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const auth = await apiTenant(['owner', 'admin'])
    if (!auth.ok) return auth.res

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File wajib diisi' }, { status: 400 })

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format harus JPG, PNG, atau WebP' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran maksimal 2MB' }, { status: 400 })
    }

    // Subfolder opsional (mis. 'landing', 'gallery'); default 'therapists'.
    const rawFolder = String(formData.get('folder') ?? 'therapists')
    const folder = /^[a-z0-9-]{1,30}$/.test(rawFolder) ? rawFolder : 'therapists'

    try {
      // Path diawali clinic_id utk isolasi antar klinik (lihat CLAUDE.md §8).
      const url = await uploadImageToCloudinary(file, { folder: `${auth.clinicId}/${folder}` })
      return NextResponse.json({ url })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'Gagal upload foto' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
