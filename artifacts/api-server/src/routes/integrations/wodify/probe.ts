/**
 * Wodify API probe script.
 *
 * Run with a real API key to discover available endpoints and field shapes.
 * This is a one-time verification tool, NOT part of the sync layer.
 *
 * Usage:
 *   WODIFY_API_KEY=your-key npx tsx artifacts/api-server/src/routes/integrations/wodify/probe.ts
 */

const API_KEY = process.env.WODIFY_API_KEY;
const BASE_URL = "https://api.wodify.com/v1";

if (!API_KEY) {
  console.error("Set WODIFY_API_KEY environment variable to run this probe.");
  process.exit(1);
}

const ENDPOINTS_TO_PROBE = [
  { path: "/clients", description: "Client/Member list" },
  { path: "/client-statuses", description: "Client status taxonomy" },
  { path: "/memberships", description: "Membership list" },
  { path: "/membership", description: "Membership (alt path)" },
  { path: "/invoices", description: "Invoice list" },
  { path: "/class-signins", description: "Class sign-in records" },
  { path: "/class-sign-ins", description: "Class sign-ins (alt path)" },
  { path: "/attendance", description: "Attendance records" },
  { path: "/signins", description: "Sign-ins (alt path)" },
  { path: "/classes", description: "Class schedule" },
  { path: "/programs", description: "Program list" },
  { path: "/reservations", description: "Reservations" },
  { path: "/client-reservations", description: "Client reservations" },
  { path: "/revenue-categories", description: "Revenue categories" },
  { path: "/leads", description: "Lead list" },
];

async function probeEndpoint(path: string, description: string) {
  const url = `${BASE_URL}${path}`;
  try {
    const resp = await fetch(url, {
      headers: { "x-api-key": API_KEY! },
    });
    const status = resp.status;
    const contentType = resp.headers.get("content-type") || "";

    if (status === 200) {
      const body = await resp.text();
      const preview = body.substring(0, 1500);
      let fieldNames: string[] = [];
      try {
        const json = JSON.parse(body);
        if (Array.isArray(json) && json.length > 0) {
          fieldNames = Object.keys(json[0]);
        } else if (typeof json === "object" && json !== null) {
          const firstArrayKey = Object.keys(json).find(k => Array.isArray(json[k]));
          if (firstArrayKey && json[firstArrayKey].length > 0) {
            fieldNames = Object.keys(json[firstArrayKey][0]);
          } else {
            fieldNames = Object.keys(json);
          }
        }
      } catch {}

      return {
        path,
        description,
        status,
        available: true,
        fieldNames,
        preview,
        rateLimit: resp.headers.get("x-ratelimit-limit") || resp.headers.get("ratelimit-limit") || null,
        rateLimitRemaining: resp.headers.get("x-ratelimit-remaining") || null,
      };
    }

    return {
      path,
      description,
      status,
      available: false,
      body: (await resp.text()).substring(0, 500),
    };
  } catch (err: any) {
    return {
      path,
      description,
      status: 0,
      available: false,
      error: err.message,
    };
  }
}

async function main() {
  console.log("=== Wodify API Probe ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY!.substring(0, 8)}...`);
  console.log("");

  const results = [];
  for (const ep of ENDPOINTS_TO_PROBE) {
    console.log(`Probing ${ep.path} (${ep.description})...`);
    const result = await probeEndpoint(ep.path, ep.description);
    results.push(result);

    if (result.available) {
      console.log(`  ✅ ${result.status} — ${(result as any).fieldNames?.length || 0} fields found`);
      if ((result as any).fieldNames?.length > 0) {
        console.log(`  Fields: ${(result as any).fieldNames.join(", ")}`);
      }
      if ((result as any).rateLimit) {
        console.log(`  Rate limit: ${(result as any).rateLimit} (remaining: ${(result as any).rateLimitRemaining})`);
      }
    } else {
      console.log(`  ❌ ${result.status} — ${(result as any).body?.substring(0, 100) || (result as any).error || "no response"}`);
    }
    console.log("");
  }

  console.log("\n=== SUMMARY ===");
  console.log("Available endpoints:");
  for (const r of results.filter(r => r.available)) {
    console.log(`  ✅ ${r.path} — ${r.description}`);
  }
  console.log("\nUnavailable endpoints:");
  for (const r of results.filter(r => !r.available)) {
    console.log(`  ❌ ${r.path} (${r.status}) — ${r.description}`);
  }

  console.log("\n=== FULL RESULTS (JSON) ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
