import { chat } from "../utils/llm.js";
/**
 * Sub-query enhancement: decomposes complex questions into focused sub-queries
 * for multi-faceted retrieval.
 */
export async function decomposeQuery(query, maxSubQueries) {
    const raw = await chat("Decompose the user question into focused sub-queries for document search. " +
        `Return at most ${maxSubQueries} sub-queries, one per line. No numbering, no bullets.`, query, { maxTokens: 200, temperature: 0.0 });
    const subQueries = raw
        .split("\n")
        .map((line) => line.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
        .filter(Boolean)
        .slice(0, maxSubQueries);
    return subQueries.length > 0 ? subQueries : [query];
}
