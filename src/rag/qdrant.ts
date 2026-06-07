import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../env.js";

/**
 * Qdrant URL normalization:
 * - Local Docker:  http://localhost:6333
 * - Qdrant Cloud:  https://<cluster>.aws.cloud.qdrant.io:6333  (port 6333 required per docs)
 */
export function normalizeQdrantUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Qdrant Cloud REST API runs on port 6333 (per official docs)
  if (url.includes("cloud.qdrant.io") && !url.match(/:\d+$/)) {
    url = `${url}:6333`;
  }

  return url;
}

export function createQdrantClient(): QdrantClient {
  const url = normalizeQdrantUrl(env.QDRANT_URL);

  return new QdrantClient({
    url,
    apiKey: env.QDRANT_API_KEY || undefined,
    checkCompatibility: false,
    timeout: 60000,
  });
}

export const client = createQdrantClient();

export interface QdrantHealthResult {
  ok: boolean;
  url: string;
  hasApiKey: boolean;
  error?: string;
  hint?: string;
}

export async function checkQdrantHealth(): Promise<QdrantHealthResult> {
  const url = normalizeQdrantUrl(env.QDRANT_URL);
  const hasApiKey = Boolean(env.QDRANT_API_KEY?.trim());
  const isCloud = url.includes("cloud.qdrant.io");

  try {
    await client.getCollections();
    return { ok: true, url, hasApiKey };
  } catch (error: any) {
    const status = error?.status;
    let hint: string;

    if (status === 404) {
      hint = isCloud
        ? "Cluster not found. Your Qdrant Cloud cluster may be deleted, suspended, or the URL is wrong. " +
          "Open https://cloud.qdrant.io → Clusters → copy the REST endpoint URL and a fresh API key."
        : "Qdrant is not running locally. Start it with: docker run -p 6333:6333 qdrant/qdrant";
    } else if (status === 401 || status === 403) {
      hint = "Invalid or missing API key. Generate a new key in the Qdrant Cloud console.";
    } else {
      hint = isCloud
        ? "Check QDRANT_URL and QDRANT_API_KEY in your .env file."
        : "Ensure Qdrant Docker is running at http://localhost:6333";
    }

    return {
      ok: false,
      url,
      hasApiKey,
      error: error?.message || String(error),
      hint,
    };
  }
}

export function qdrantConnectionHint(): string {
  const url = normalizeQdrantUrl(env.QDRANT_URL);
  const isCloud = url.includes("cloud.qdrant.io");
  if (isCloud) {
    return (
      "Your Qdrant Cloud cluster is unreachable (404). " +
      "Go to https://cloud.qdrant.io → Clusters, verify the cluster is running, " +
      "and copy the REST endpoint (with :6333) and API key into .env."
    );
  }
  return "Start local Qdrant: docker run -p 6333:6333 qdrant/qdrant";
}
