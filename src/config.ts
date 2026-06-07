/** Speed vs accuracy tradeoff profiles for the RAG pipeline. */
export type RetrievalMode = "fast" | "balanced" | "accurate";

export interface ModeConfig {
  label: string;
  description: string;
  /** Tradeoff: lower latency vs higher retrieval quality */
  retrievalK: number;
  rerankCandidates: number;
  useQueryRewrite: boolean;
  useSubQueries: boolean;
  useHyde: boolean;
  useReranking: boolean;
  maxSubQueries: number;
  maxContextTokens: number;
  maxOutputTokens: number;
}

/** Chunk size & overlap tradeoffs — smaller chunks = precision, larger = context. */
export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  rationale: string;
}

export const CHUNK_PRESETS: Record<RetrievalMode, ChunkConfig> = {
  fast: {
    chunkSize: 800,
    chunkOverlap: 50,
    rationale: "Larger chunks, less overlap → fewer embeddings, faster ingest & search.",
  },
  balanced: {
    chunkSize: 600,
    chunkOverlap: 100,
    rationale: "Default balance between boundary context and semantic precision.",
  },
  accurate: {
    chunkSize: 400,
    chunkOverlap: 150,
    rationale: "Smaller chunks, high overlap → best recall for fine-grained facts.",
  },
};

export const MODE_CONFIG: Record<RetrievalMode, ModeConfig> = {
  fast: {
    label: "Fast",
    description: "Prioritizes speed: basic vector search, no HyDE/reranking.",
    retrievalK: 3,
    rerankCandidates: 3,
    useQueryRewrite: false,
    useSubQueries: false,
    useHyde: false,
    useReranking: false,
    maxSubQueries: 1,
    maxContextTokens: 1500,
    maxOutputTokens: 300,
  },
  balanced: {
    label: "Balanced",
    description: "Query rewrite + LLM judge + corrective fallback.",
    retrievalK: 5,
    rerankCandidates: 8,
    useQueryRewrite: true,
    useSubQueries: true,
    useHyde: false,
    useReranking: true,
    maxSubQueries: 3,
    maxContextTokens: 2500,
    maxOutputTokens: 500,
  },
  accurate: {
    label: "Accurate",
    description: "Full pipeline: rewrite, sub-queries, HyDE, cross-encoder rerank.",
    retrievalK: 8,
    rerankCandidates: 16,
    useQueryRewrite: true,
    useSubQueries: true,
    useHyde: true,
    useReranking: true,
    maxSubQueries: 5,
    maxContextTokens: 4000,
    maxOutputTokens: 800,
  },
};

export const LLM_MODEL = "meta-llama/Llama-3.1-8B-Instruct:fastest";
export const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
export const CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2";
export const COLLECTION_NAME = "hf_rag_v3";
