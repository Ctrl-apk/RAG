import { MODE_CONFIG } from "../config.js";
import { runRewrite, runSubQueries, runGrader, runAnswer } from "../langchain/chains.js";
import { wikipediaTool } from "../langchain/tools.js";
import { advancedRetrieve } from "../rag/retrieval.js";
import { applyTokenBudget } from "../utils/token-budget.js";
import { BottleneckTracker } from "../utils/bottlenecks.js";
import type { RAGGraphState } from "./state.js";

let activeTracker = new BottleneckTracker();

export function getTracker(): BottleneckTracker {
  return activeTracker;
}

export function resetTracker(): BottleneckTracker {
  activeTracker = new BottleneckTracker();
  return activeTracker;
}

/** Node: Query rewriting using SLM via LCEL chain. */
export async function queryRewriteNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const config = MODE_CONFIG[state.mode];
  if (!config.useQueryRewrite) {
    return { rewrittenQuery: state.query, agentHandoffs: ["retrieval-agent:skip-rewrite"] };
  }

  const rewritten = await activeTracker.track("query_rewrite", () => runRewrite(state.query));
  return {
    rewrittenQuery: rewritten || state.query,
    agentHandoffs: ["retrieval-agent:query-rewritten"],
  };
}

/** Node: Sub-query enhancement — decompose complex questions. */
export async function subQueryNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const config = MODE_CONFIG[state.mode];
  if (!config.useSubQueries) {
    return { subQueries: [state.rewrittenQuery || state.query] };
  }

  const subs = await activeTracker.track("sub_query", () =>
    runSubQueries(state.rewrittenQuery || state.query, config.maxSubQueries)
  );
  return { subQueries: subs, agentHandoffs: ["retrieval-agent:sub-queries-generated"] };
}

/** Node: Advanced retrieval (HyDE + vector search + optional reranking). */
export async function retrieveNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const config = MODE_CONFIG[state.mode];
  const queries = state.subQueries?.length ? state.subQueries : [state.rewrittenQuery || state.query];

  const chunks = await advancedRetrieve(state.docId, queries, config, activeTracker);
  return {
    retrievedChunks: chunks,
    rerankedChunks: chunks,
    agentHandoffs: ["retrieval-agent:chunks-retrieved"],
  };
}

/** Node: LLM judge — grades retrieved context relevance. */
export async function gradeNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const context = (state.rerankedChunks || []).join("\n\n");
  if (!context.trim()) {
    return { isRelevant: false, contextText: "", agentHandoffs: ["grader-agent:no-context"] };
  }

  const isRelevant = await activeTracker.track("grading", () => runGrader(state.query, context));
  return {
    isRelevant,
    contextText: context,
    agentHandoffs: [`grader-agent:${isRelevant ? "relevant" : "irrelevant"}`],
  };
}

/** Node: Corrective RAG — web search fallback when context is irrelevant. */
export async function webSearchNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const result = await activeTracker.track("web_search", () =>
    wikipediaTool.invoke({ query: state.query })
  );
  return {
    contextText: result,
    usedWebSearch: true,
    agentHandoffs: ["research-agent:web-search-complete"],
  };
}

/** Node: Token budget enforcement — context window bottleneck management. */
export async function tokenBudgetNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const config = MODE_CONFIG[state.mode];
  const chunks = state.contextText ? [state.contextText] : state.rerankedChunks || [];
  const budget = applyTokenBudget(chunks, config.maxContextTokens);

  return {
    contextText: budget.text,
    tokenInfo: {
      originalTokens: budget.originalTokens,
      finalTokens: budget.finalTokens,
      truncated: budget.truncated,
      droppedChunks: budget.droppedChunks,
    },
    agentHandoffs: ["writer-agent:token-budget-applied"],
  };
}

/** Node: Final answer generation. */
export async function generateNode(state: RAGGraphState): Promise<Partial<RAGGraphState>> {
  const config = MODE_CONFIG[state.mode];
  const answer = await activeTracker.track("generation", () =>
    runAnswer(state.query, state.contextText || "", config.maxOutputTokens)
  );

  const source = state.usedWebSearch ? "Web Search" : "Document";
  return {
    answer: `${answer.trim()}\n\n*(Source: ${source})*`,
    metrics: activeTracker.report(),
    agentHandoffs: ["writer-agent:answer-generated"],
  };
}

/** Conditional edge: route to web search or token budget after grading. */
export function routeAfterGrade(state: RAGGraphState): "web_search" | "token_budget" {
  return state.isRelevant ? "token_budget" : "web_search";
}
