export function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function getActor(req: any) {
  return {
    userId: req.user?.id,
    name: req.user?.username || req.user?.name || undefined,
    source: "ui" as const,
  };
}
