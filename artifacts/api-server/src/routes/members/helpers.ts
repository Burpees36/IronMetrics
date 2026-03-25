export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function parseMemberId(params: any): number | null {
  const raw = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}
