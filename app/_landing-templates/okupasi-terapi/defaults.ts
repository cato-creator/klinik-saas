// Gambar default (placeholder) untuk template Okupasi Terapi.
// Sumber: Unsplash (gratis & hotlink-able). Bersifat SEMENTARA — owner dapat
// menggantinya dari /owner/landing. Dipakai bersama oleh template & editor owner.
// Memakai ID foto yang sama-terbukti dengan template Fisio (dijamin loading),
// tapi disusun ulang agar tampilan default OT tidak identik dengan Fisio.
const U = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const OKU_IMG = {
  hero: U("photo-1576765608535-5f04d1e3f289", 1200),
  about: U("photo-1503454537195-1dcabb73ffb9", 1000),
  story: U("photo-1471286174890-9c112ffca5b4", 900),
  gallery: [
    U("photo-1597393353415-b3730f3719fe", 600),
    U("photo-1602052793312-b99c2a9ee797", 600),
    U("photo-1577896851231-70ef18881754", 600),
    U("photo-1503676260728-1c00da094a0b", 600),
    U("photo-1588072432836-e10032774350", 600),
    U("photo-1516627145497-ae6968895b74", 600),
  ],
  avatars: [
    U("photo-1535713875002-d1d0cf377fde", 160),
    U("photo-1494790108377-be9c29b29330", 160),
    U("photo-1500648767791-00dcc994a43e", 160),
  ],
};
