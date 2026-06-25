// Pemicu GitHub Actions (alternatif GitLab — dipakai bila akun GitLab terkena gate
// verifikasi). Server-only.
//
// Memakai repository_dispatch: panel POST event ke repo → workflow
// .github/workflows/provision.yml menangkapnya dan jalan di self-hosted runner.
//
// Env (server-only, set via wrangler secret):
//   GITHUB_REPO   — "owner/repo" (mis. "akunbaru/klinik-saas")
//   GITHUB_TOKEN  — Personal Access Token (classic: scope `repo`; fine-grained:
//                   Contents + Actions = Read/Write pada repo itu)
//   GITHUB_API_URL — opsional, default https://api.github.com

const BOM = String.fromCharCode(0xfeff);
function cleanEnv(v?: string): string {
  return (v ?? "").split(BOM).join("").trim();
}

export const EVENT_TYPE = "provision-clinic";

export type GhTriggerResult = { ok: true; webUrl: string | null } | { ok: false; error: string };

export function isGitHubConfigured(): boolean {
  return !!(cleanEnv(process.env.GITHUB_REPO) && cleanEnv(process.env.GITHUB_TOKEN));
}

// Memicu workflow via repository_dispatch. client_payload diteruskan ke job sebagai
// github.event.client_payload.*. GitHub membalas 204 tanpa body (tak ada run id),
// jadi webUrl mengarah ke halaman Actions repo.
export async function triggerWorkflow(payload: Record<string, string>): Promise<GhTriggerResult> {
  const apiUrl = cleanEnv(process.env.GITHUB_API_URL) || "https://api.github.com";
  const repo = cleanEnv(process.env.GITHUB_REPO);
  const token = cleanEnv(process.env.GITHUB_TOKEN);

  if (!repo || !token) return { ok: false, error: "GITHUB_REPO / GITHUB_TOKEN belum di-set." };

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "klinik-saas-panel",
        "content-type": "application/json",
      },
      body: JSON.stringify({ event_type: EVENT_TYPE, client_payload: payload }),
    });
  } catch (e) {
    return { ok: false, error: `Gagal menghubungi GitHub: ${(e as Error).message}` };
  }

  if (res.status === 204) {
    return { ok: true, webUrl: `https://github.com/${repo}/actions` };
  }
  const text = await res.text().catch(() => "");
  return { ok: false, error: `GitHub menolak (${res.status}): ${text.slice(0, 300)}` };
}
