import { chat } from "../utils/llm.js";
import { embedQuery } from "./embeddings.js";
/**
 * HyDE (Hypothetical Document Embeddings):
 * Generate a hypothetical answer, embed it, and use that vector for retrieval.
 * Bridges the query-document semantic gap.
 */
export async function generateHypotheticalDocument(query) {
    return chat("Write a short hypothetical passage (2-3 sentences) that would directly answer " +
        "the following question, as if it appeared in a reference document. " +
        "Do not say 'I don't know'. Write factual-sounding prose.", query, { maxTokens: 150, temperature: 0.3 });
}
export async function hydeEmbedQuery(query) {
    const hypothetical = await generateHypotheticalDocument(query);
    return embedQuery(hypothetical);
}
