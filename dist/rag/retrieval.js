import { COLLECTION_NAME } from "../config.js";
import { embedQuery } from "./embeddings.js";
import { hydeEmbedQuery } from "./hyde.js";
import { rerankWithCrossEncoder } from "./rerank.js";
import { client } from "./qdrant.js";
async function vectorSearch(docId, vector, limit) {
    const result = await client.search(COLLECTION_NAME, {
        vector,
        limit,
        filter: { must: [{ key: "docId", match: { value: docId } }] },
    });
    return result.map((r) => r.payload?.text || "").filter(Boolean);
}
function dedupeChunks(chunks) {
    const seen = new Set();
    return chunks.filter((c) => {
        const key = c.slice(0, 120);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
export async function advancedRetrieve(docId, queries, config, tracker) {
    const allChunks = [];
    for (const q of queries) {
        const vector = await tracker.track("embedding", () => config.useHyde ? hydeEmbedQuery(q) : embedQuery(q));
        const stage = config.useHyde ? "hyde" : "retrieval";
        const chunks = await tracker.track(stage, () => vectorSearch(docId, vector, config.rerankCandidates));
        allChunks.push(...chunks);
    }
    const unique = dedupeChunks(allChunks);
    if (config.useReranking && unique.length > 0) {
        const primaryQuery = queries[0];
        return tracker.track("reranking", () => rerankWithCrossEncoder(primaryQuery, unique, config.retrievalK));
    }
    return unique.slice(0, config.retrievalK);
}
export { client };
