// Pemicu pipeline GitLab (Fase 2B). Server-only.
//
// Memakai "Pipeline trigger token" GitLab (Settings → CI/CD → Pipeline trigger
// tokens). Panel memanggil API ini agar runner (PC kita) menjalankan job deploy.
//
// Env (server-only, set via wrangler secret):
//   GITLAB_PROJECT_ID    — id numerik project (halaman project → titik tiga → "Copy project ID")
//   GITLAB_TRIGGER_TOKEN — pipeline trigger token
//   GITLAB_API_URL       — opsional, default https://gitlab.com
//   GITLAB_REF           — opsional, default main

const BOM = String.fromCharCode(0xfeff);
function cleanEnv(v?: string): string {
  return (v ?? "").split(BOM).join("").trim();
}

export type TriggerResult =
  | { ok: true; pipelineId: number; webUrl: string | null }
  | { ok: false; error: string };

// Memicu pipeline dengan variabel yang diteruskan ke job (dilihat runner sbg env).
export async function triggerPipeline(variables: Record<string, string>): Promise<TriggerResult> {
  const apiUrl = cleanEnv(process.env.GITLAB_API_URL) || "https://gitlab.com";
  const projectId = cleanEnv(process.env.GITLAB_PROJECT_ID);
  const triggerToken = cleanEnv(process.env.GITLAB_TRIGGER_TOKEN);
  const ref = cleanEnv(process.env.GITLAB_REF) || "main";

  if (!projectId || !triggerToken) {
    return { ok: false, error: "GITLAB_PROJECT_ID / GITLAB_TRIGGER_TOKEN belum di-set." };
  }

  const body = new URLSearchParams();
  body.set("token", triggerToken);
  body.set("ref", ref);
  for (const [k, v] of Object.entries(variables)) body.set(`variables[${k}]`, v);

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/v4/projects/${encodeURIComponent(projectId)}/trigger/pipeline`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (e) {
    return { ok: false, error: `Gagal menghubungi GitLab: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `GitLab menolak (${res.status}): ${text.slice(0, 300)}` };
  }

  const data = (await res.json().catch(() => null)) as { id?: number; web_url?: string } | null;
  if (!data?.id) return { ok: false, error: "Respons GitLab tidak terduga." };
  return { ok: true, pipelineId: data.id, webUrl: data.web_url ?? null };
}
