import { chat } from "../utils/llm.js";
/**
 * Query rewriting using a Small Language Model (SLM).
 * Improves retrieval by translating informal/vague queries into search-optimized form.
 */
export async function rewriteQuery(query) {
    const rewritten = await chat("You are a query translation expert. Rewrite the user question into a clear, " +
        "search-optimized query for document retrieval. Return ONLY the rewritten query, nothing else.", query, { maxTokens: 100, temperature: 0.0 });
    return rewritten || query;
}
