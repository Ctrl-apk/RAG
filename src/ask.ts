import { RAGOrchestrator } from "./agents/orchestrator.js";
import type { RetrievalMode } from "./config.js";
import type { OrchestratedResult } from "./agents/orchestrator.js";

const orchestrator = new RAGOrchestrator();

export async function ask(
  docId: string,
  query: string,
  mode: RetrievalMode = "balanced",
  threadId?: string
): Promise<OrchestratedResult> {
  return orchestrator.ask(docId, query, mode, threadId);
}
