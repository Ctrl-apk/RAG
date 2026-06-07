import { env } from "../env.js";
import { CROSS_ENCODER_MODEL } from "../config.js";

interface ScoredChunk {
  text: string;
  score: number;
}

/**
 * Cross-encoder re-ranking: scores (query, chunk) pairs jointly for higher accuracy
 * than bi-encoder ANN search alone.
 */
export async function rerankWithCrossEncoder(
  query: string,
  chunks: string[],
  topK: number
): Promise<string[]> {
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const scored = await Promise.all(
    chunks.map(async (text) => ({
      text,
      score: await scorePair(query, text),
    }))
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.text);
}

async function scorePair(query: string, document: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${CROSS_ENCODER_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.HUGGINGFACEHUB_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: [[query, document]] }),
      }
    );

    if (!response.ok) {
      return fallbackScore(query, document);
    }

    const result = await response.json();
    if (Array.isArray(result) && result[0]?.score !== undefined) {
      return result[0].score;
    }
    if (Array.isArray(result) && Array.isArray(result[0]) && result[0][0]?.score !== undefined) {
      return result[0][0].score;
    }
    return fallbackScore(query, document);
  } catch {
    return fallbackScore(query, document);
  }
}

/** Lexical overlap fallback when cross-encoder API is unavailable. */
function fallbackScore(query: string, document: string): number {
  const qTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  const dTokens = document.toLowerCase().split(/\W+/).filter(Boolean);
  let overlap = 0;
  for (const t of dTokens) {
    if (qTokens.has(t)) overlap++;
  }
  return overlap / Math.max(dTokens.length, 1);
}

export type { ScoredChunk };
