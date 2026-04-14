async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = (window as Record<string, unknown>).Clerk as
      | { session?: { getToken: () => Promise<string | null> } }
      | undefined;
    if (clerk?.session) {
      return await clerk.session.getToken();
    }
  } catch {}
  return null;
}

export async function authFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);

  try {
    const token = await getClerkToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {}

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}
