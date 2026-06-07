import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { env } from "../env.js";
import { EMBEDDING_MODEL } from "../config.js";
export const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: env.HUGGINGFACEHUB_API_KEY,
    model: EMBEDDING_MODEL,
});
export async function embedQuery(text) {
    return embeddings.embedQuery(text);
}
export async function embedDocuments(texts) {
    return embeddings.embedDocuments(texts);
}
