import { RAGOrchestrator } from "./agents/orchestrator.js";
const orchestrator = new RAGOrchestrator();
export async function ask(docId, query, mode = "balanced", threadId) {
    return orchestrator.ask(docId, query, mode, threadId);
}
