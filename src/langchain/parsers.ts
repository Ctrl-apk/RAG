import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

/** LangChain Output Parsers for structured LLM responses. */
export const stringParser = new StringOutputParser();

export const relevanceSchema = z.object({
  relevant: z.boolean(),
  reason: z.string().optional(),
});

export const subQuerySchema = z.object({
  subQueries: z.array(z.string()).min(1),
});

/** Parse newline-separated sub-queries from LLM output. */
export function parseSubQueries(raw: string, max: number): string[] {
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^[\d\-\*\.\)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);
  return lines.length > 0 ? lines : [];
}

/** Parse binary yes/no relevance grade. */
export function parseRelevance(raw: string): boolean {
  return raw.toLowerCase().trim().includes("yes");
}
