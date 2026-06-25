// Bikin saran subdomain dari nama klinik. normalize("NFD") memecah huruf beraksen
// jadi huruf dasar + combining mark; [^a-z0-9] lalu membuang mark & simbol.
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "klinik"
  );
}
