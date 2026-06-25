// Gambar default (placeholder) untuk template Fisioterapi.
// Sumber: Unsplash (gratis & hotlink-able). Bersifat SEMENTARA — owner dapat
// menggantinya dari /owner/landing. Dipakai bersama oleh template & editor owner
// agar pratinjau di editor konsisten dengan tampilan landing.
const U = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const FISIO_IMG = {
  hero: U("photo-1764314138160-5f04f4a50dae", 1200),
  about: U("photo-1764314484083-cbd0de7e512c", 1000),
  story: U("photo-1770219287080-9c73532fa878", 900),
  gallery: [
    U("photo-1645005512968-0c1fe99f0093", 600),
    U("photo-1649751361457-01d3a696c7e6", 600),
    U("photo-1586401100295-7a8096fd231a", 600),
    U("photo-1540205895360-4ad4cffb3aa8", 600),
    U("photo-1522898467493-49726bf28798", 600),
    U("photo-1770012905139-713758ded6ec", 600),
  ],
  avatars: [
    U("photo-1534528741775-53994a69daeb", 160),
    U("photo-1544005313-94ddf0286df2", 160),
    U("photo-1438761681033-6461ffad8d80", 160),
  ],
};
