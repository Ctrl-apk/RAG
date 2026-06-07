import { AgentSDK } from "./sdk.js";
import { LifecycleManager } from "./lifecycle.js";
import { runRAGGraph } from "../graph/workflow.js";
export class RAGOrchestrator {
    sdk = new AgentSDK();
    lifecycle = new LifecycleManager();
    constructor() {
        this.setupAgents();
    }
    setupAgents() {
        const retrieval = this.sdk.create({
            name: "retrieval-agent",
            role: "Query rewriting, sub-query decomposition, and vector retrieval",
        });
        const grader = this.sdk.create({
            name: "grader-agent",
            role: "LLM judge for retrieved context relevance",
        });
        const research = this.sdk.create({
            name: "research-agent",
            role: "Corrective RAG web search fallback",
        });
        const writer = this.sdk.create({
            name: "writer-agent",
            role: "Token-budgeted answer generation",
        });
        retrieval.handoff(grader);
        grader.handoff(research);
        research.handoff(writer);
    }
    async ask(docId, query, mode = "balanced", threadId) {
        this.lifecycle.clear();
        const agents = this.sdk.list();
        for (const agent of agents) {
            this.lifecycle.record(agent, "idle", "running", "orchestrator-invoked");
        }
        const graphResult = await runRAGGraph(docId, query, mode, threadId);
        for (const handoff of graphResult.agentHandoffs) {
            const agentName = handoff.split(":")[0];
            const detail = handoff.split(":").slice(1).join(":");
            const agent = agents.find((a) => a.name === agentName);
            if (agent) {
                this.lifecycle.record(agent, "running", "completed", detail);
            }
        }
        for (const agent of agents) {
            if (agent.status === "running") {
                this.lifecycle.record(agent, "running", "completed", "graph-finished");
            }
        }
        return {
            ...graphResult,
            lifecycle: this.lifecycle.getTimeline(),
            sdkAgents: agents.map((a) => ({
                name: a.name,
                role: a.role,
                handoffTo: a.getHandoffTarget()?.name,
            })),
        };
    }
    dispose() {
        this.sdk.disposeAll();
        this.lifecycle.clear();
    }
}
