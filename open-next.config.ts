// Konfigurasi adapter Cloudflare untuk Next.js (OpenNext).
// Lihat https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // Incremental cache → Workers KV (binding NEXT_INC_CACHE_KV di wrangler.jsonc).
  // Mengaktifkan Next Data Cache / unstable_cache agar data publik (landing per
  // subdomain) di-cache di edge → kurangi beban SSR/DB. CLAUDE.md §12.3.
  incrementalCache: kvIncrementalCache,
});
