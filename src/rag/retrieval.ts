import { COLLECTION_NAME, type ModeConfig } from "../config.js";
import { embedQuery } from "./embeddings.js";
import { hydeEmbedQuery } from "./hyde.js";
import { rerankWithCrossEncoder } from "./rerank.js";
import { client } from "./qdrant.js";
import type { BottleneckTracker } from "../utils/bottlenecks.js";

async function vectorSearch(
  docId: string,
  vector: number[],
  limit: number
): Promise<string[]> {
  const result = await client.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: { must: [{ key: "docId", match: { value: docId } }] },
  });
  return result.map((r) => (r.payload?.text as string) || "").filter(Boolean);
}

function dedupeChunks(chunks: string[]): string[] {
  const seen = new Set<string>();
  return chunks.filter((c) => {
    const key = c.slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function advancedRetrieve(
  docId: string,
  queries: string[],
  config: ModeConfig,
  tracker: BottleneckTracker
): Promise<string[]> {
  const allChunks: string[] = [];

  for (const q of queries) {
    const vector = await tracker.track("embedding", () =>
      config.useHyde ? hydeEmbedQuery(q) : embedQuery(q)
    );

    const stage = config.useHyde ? "hyde" : "retrieval";
    const chunks = await tracker.track(stage, () =>
      vectorSearch(docId, vector, config.rerankCandidates)
    );
    allChunks.push(...chunks);
  }

  const unique = dedupeChunks(allChunks);

  if (config.useReranking && unique.length > 0) {
    const primaryQuery = queries[0];
    return tracker.track("reranking", () =>
      rerankWithCrossEncoder(primaryQuery, unique, config.retrievalK)
    );
  }

  return unique.slice(0, config.retrievalK);
}

export { client };
