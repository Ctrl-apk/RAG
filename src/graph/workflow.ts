import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import {
  queryRewriteNode,
  subQueryNode,
  retrieveNode,
  gradeNode,
  webSearchNode,
  tokenBudgetNode,
  generateNode,
  routeAfterGrade,
  resetTracker,
} from "./nodes.js";
import type { RetrievalMode } from "../config.js";
import type { BottleneckReport } from "../utils/bottlenecks.js";

/**
 * LangGraph workflow — state machine for the RAG pipeline.
 * Nodes: rewrite → sub-query → retrieve → grade → [web_search?] → token_budget → generate
 * Conditional branching after grade (Corrective RAG).
 * Checkpointing via MemorySaver for agent state persistence.
 */

const checkpointer = new MemorySaver();

function buildGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("query_rewrite", queryRewriteNode)
    .addNode("sub_query", subQueryNode)
    .addNode("retrieve", retrieveNode)
    .addNode("grade", gradeNode)
    .addNode("web_search", webSearchNode)
    .addNode("token_budget", tokenBudgetNode)
    .addNode("generate", generateNode)

    .addEdge(START, "query_rewrite")
    .addEdge("query_rewrite", "sub_query")
    .addEdge("sub_query", "retrieve")
    .addEdge("retrieve", "grade")
    .addConditionalEdges("grade", routeAfterGrade, {
      web_search: "web_search",
      token_budget: "token_budget",
    })
    .addEdge("web_search", "token_budget")
    .addEdge("token_budget", "generate")
    .addEdge("generate", END);

  return graph.compile({ checkpointer });
}

const compiledGraph = buildGraph();

export interface AskResult {
  answer: string;
  metrics: BottleneckReport;
  mode: RetrievalMode;
  rewrittenQuery?: string;
  subQueries?: string[];
  usedWebSearch: boolean;
  isRelevant: boolean;
  tokenInfo?: {
    originalTokens: number;
    finalTokens: number;
    truncated: boolean;
    droppedChunks: number;
  };
  agentHandoffs: string[];
  threadId: string;
}

export async function runRAGGraph(
  docId: string,
  query: string,
  mode: RetrievalMode = "balanced",
  threadId?: string
): Promise<AskResult> {
  resetTracker();
  const tid = threadId || `thread-${Date.now()}`;

  const result = await compiledGraph.invoke(
    {
      docId,
      query,
      mode,
      threadId: tid,
      rewrittenQuery: "",
      subQueries: [],
      retrievedChunks: [],
      rerankedChunks: [],
      contextText: "",
      isRelevant: false,
      usedWebSearch: false,
      answer: "",
      metrics: null,
      agentHandoffs: [],
      tokenInfo: null,
    },
    { configurable: { thread_id: tid } }
  );

  return {
    answer: result.answer,
    metrics: result.metrics!,
    mode,
    rewrittenQuery: result.rewrittenQuery,
    subQueries: result.subQueries,
    usedWebSearch: result.usedWebSearch,
    isRelevant: result.isRelevant,
    tokenInfo: result.tokenInfo ?? undefined,
    agentHandoffs: result.agentHandoffs,
    threadId: tid,
  };
}

export { compiledGraph, checkpointer };
