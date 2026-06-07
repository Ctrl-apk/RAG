import { Annotation } from "@langchain/langgraph";
import type { RetrievalMode } from "../config.js";
import type { BottleneckReport } from "../utils/bottlenecks.js";

/** LangGraph shared state — flows through all nodes and edges. */
export const GraphState = Annotation.Root({
  docId: Annotation<string>,
  query: Annotation<string>,
  mode: Annotation<RetrievalMode>,
  threadId: Annotation<string>,

  rewrittenQuery: Annotation<string>,
  subQueries: Annotation<string[]>,
  retrievedChunks: Annotation<string[]>,
  rerankedChunks: Annotation<string[]>,
  contextText: Annotation<string>,

  isRelevant: Annotation<boolean>,
  usedWebSearch: Annotation<boolean>,
  answer: Annotation<string>,

  metrics: Annotation<BottleneckReport | null>,
  agentHandoffs: Annotation<string[]>({
    reducer: (prev, next) => [...(prev ?? []), ...(next ?? [])],
    default: () => [],
  }),
  tokenInfo: Annotation<{
    originalTokens: number;
    finalTokens: number;
    truncated: boolean;
    droppedChunks: number;
  } | null>,
});

export type RAGGraphState = typeof GraphState.State;
