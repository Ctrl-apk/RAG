/** Backward-compatible re-exports from modular RAG pipeline. */
export { ingest } from "./rag/ingest.js";
import { advancedRetrieve } from "./rag/retrieval.js";
import { MODE_CONFIG } from "./config.js";
import { BottleneckTracker } from "./utils/bottlenecks.js";
/** Simple retrieve wrapper for backward compatibility. */
export async function retrieve(docId, query) {
    const tracker = new BottleneckTracker();
    return advancedRetrieve(docId, [query], MODE_CONFIG.balanced, tracker);
}
export { rewriteQuery } from "./rag/query-rewrite.js";
export { decomposeQuery } from "./rag/sub-query.js";
export { generateHypotheticalDocument, hydeEmbedQuery } from "./rag/hyde.js";
export { rerankWithCrossEncoder } from "./rag/rerank.js";
export { gradeRelevance } from "./rag/judge.js";
