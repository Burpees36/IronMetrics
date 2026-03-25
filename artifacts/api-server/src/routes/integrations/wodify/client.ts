import type {
  WodifyApiConfig,
  WodifyClient,
  WodifyClientListResponse,
  WodifyMembership,
  WodifyMembershipListResponse,
} from "./types";

const WODIFY_BASE_URL = "https://api.wodify.com/v1";
const PAGE_SIZE = 100;

export function createWodifyClient(apiKey: string): WodifyApiClient {
  return new WodifyApiClient({ apiKey, baseUrl: WODIFY_BASE_URL });
}

export class WodifyApiClient {
  private config: WodifyApiConfig;

  constructor(config: WodifyApiConfig) {
    this.config = config;
  }

  private async fetchPage<T>(
    endpoint: string,
    page: number,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}?page=${page}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": this.config.apiKey,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new WodifyApiError(
        `Wodify API ${endpoint} returned ${res.status}: ${body}`,
        res.status,
      );
    }

    return res.json() as Promise<T>;
  }

  async validateKey(): Promise<{ valid: boolean; clientCount: number }> {
    try {
      const data = await this.fetchPage<WodifyClientListResponse>("/clients", 1);
      return { valid: true, clientCount: data.clients?.length ?? 0 };
    } catch (err) {
      if (err instanceof WodifyApiError && (err.status === 401 || err.status === 403)) {
        return { valid: false, clientCount: 0 };
      }
      throw err;
    }
  }

  async fetchAllClients(): Promise<WodifyClient[]> {
    const all: WodifyClient[] = [];
    let page = 1;

    while (true) {
      const data = await this.fetchPage<WodifyClientListResponse>("/clients", page);
      const clients = data.clients ?? [];
      if (clients.length === 0) break;
      all.push(...clients);
      if (clients.length < PAGE_SIZE) break;
      page++;
    }

    return all;
  }

  async fetchAllMemberships(): Promise<WodifyMembership[]> {
    const all: WodifyMembership[] = [];
    let page = 1;

    while (true) {
      const data = await this.fetchPage<WodifyMembershipListResponse>("/memberships", page);
      const memberships = data.memberships ?? [];
      if (memberships.length === 0) break;
      all.push(...memberships);
      if (memberships.length < PAGE_SIZE) break;
      page++;
    }

    return all;
  }
}

export class WodifyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "WodifyApiError";
    this.status = status;
  }
}
