import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import wikiLib from "wikipedia";
import { advancedRetrieve } from "../rag/retrieval.js";
import { MODE_CONFIG } from "../config.js";
import type { BottleneckTracker } from "../utils/bottlenecks.js";

const wiki = (wikiLib as any).default || wikiLib;

/** LangChain Tool calling — structured tools the agent graph can invoke. */

export const wikipediaTool = new DynamicStructuredTool({
  name: "wikipedia_search",
  description:
    "Search Wikipedia for external information when document context is irrelevant or missing. " +
    "Use for corrective RAG fallback.",
  schema: z.object({
    query: z.string().describe("The search query"),
  }),
  func: async ({ query }) => {
    try {
      const searchResults = await wiki.search(query);
      if (!searchResults.results?.length) return "No external information found.";
      const summary = await wiki.summary(searchResults.results[0].title);
      return summary.extract;
    } catch (e: any) {
      return `Web search failed: ${e.message}`;
    }
  },
});

export function createRetrieveTool(docId: string, tracker: BottleneckTracker) {
  return new DynamicStructuredTool({
    name: "document_retrieve",
    description: "Retrieve relevant chunks from the uploaded document using vector search.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
    func: async ({ query }) => {
      const config = MODE_CONFIG.balanced;
      const chunks = await advancedRetrieve(docId, [query], config, tracker);
      return chunks.join("\n\n") || "No chunks found.";
    },
  });
}

export const allTools = [wikipediaTool];
