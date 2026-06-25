import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const booking_id = formData.get('booking_id') as string
    const file = formData.get('file') as File | null

    if (!booking_id || !file) {
      return NextResponse.json({ error: 'booking_id dan file wajib' }, { status: 400 })
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format file harus JPG, PNG, atau WebP' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 })
    }

    const db = createServiceClient()

    // Tentukan klinik dari booking (untuk isolasi path penyimpanan).
    const { data: booking } = await db.from('bookings').select('clinic_id').eq('id', booking_id).maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

    // public_id deterministik (booking_id) → re-upload menimpa bukti lama.
    let url: string
    try {
      url = await uploadImageToCloudinary(file, {
        folder: `${booking.clinic_id}/payment-proofs`,
        publicId: booking_id,
      })
    } catch {
      return NextResponse.json({ error: 'Gagal upload file' }, { status: 500 })
    }

    await db.from('bookings').update({ payment_proof_url: url }).eq('id', booking_id)

    return NextResponse.json({ success: true, url })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
