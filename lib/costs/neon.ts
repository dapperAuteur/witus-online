// Neon usage per project through the project-scoped keys in NEON_PROJECT_KEYS. The project object
// carries the consumption counters Neon exposes on every plan; names are read defensively because
// the fields differ by API version. Branch count comes from /branches (Free: 10 per project).
const BASE = "https://console.neon.tech/api/v2";

export interface NeonProjectUsage {
  projectId: string;
  name: string;
  branches: number;
  previewBranches: number;
  computeTimeSeconds?: number;
  activeTimeSeconds?: number;
  writtenDataBytes?: number;
  dataTransferBytes?: number;
  storageBytes?: number;
  consumptionPeriodEnd?: string;
  raw: Record<string, unknown>;
}

async function neon<T>(key: string, path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Neon GET ${path} → ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return (await r.json()) as T;
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function fetchNeonProjectUsage(projectId: string, key: string): Promise<NeonProjectUsage> {
  const { project } = await neon<{ project: Record<string, unknown> }>(key, `/projects/${projectId}`);
  const { branches } = await neon<{ branches: { name: string }[] }>(key, `/projects/${projectId}/branches`);
  return {
    projectId,
    name: String(project.name ?? projectId),
    branches: branches.length,
    previewBranches: branches.filter((b) => b.name.startsWith("preview/")).length,
    computeTimeSeconds: num(project.compute_time_seconds),
    activeTimeSeconds: num(project.active_time_seconds),
    writtenDataBytes: num(project.written_data_bytes),
    dataTransferBytes: num(project.data_transfer_bytes),
    storageBytes: num(project.synthetic_storage_size) ?? num(project.data_storage_bytes_hour),
    consumptionPeriodEnd: typeof project.consumption_period_end === "string" ? project.consumption_period_end : undefined,
    raw: project,
  };
}
