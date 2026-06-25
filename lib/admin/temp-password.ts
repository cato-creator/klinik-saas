// Generate password sementara yang cukup kuat & terbaca (hindari karakter ambigu).
// Dipakai saat super admin reset password user klinik.
export function genTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) out += chars[b % chars.length];
  return out + "#7"; // pastikan ada angka & simbol
}
