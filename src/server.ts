import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { upload } from "./upload.js";
import { ingest } from "./rag/ingest.js";
import { ask } from "./ask.js";
import { MODE_CONFIG, CHUNK_PRESETS, type RetrievalMode } from "./config.js";
import { compiledGraph } from "./graph/workflow.js";
import { checkQdrantHealth } from "./rag/qdrant.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", async (_req, res) => {
  const qdrant = await checkQdrantHealth();
  res.status(qdrant.ok ? 200 : 503).json({ qdrant });
});

app.get("/api/config", (_req, res) => {
  res.json({
    modes: MODE_CONFIG,
    chunkPresets: CHUNK_PRESETS,
    pipeline: {
      stages: [
        "query_rewrite",
        "sub_query",
        "retrieve (HyDE + vector search)",
        "rerank (cross-encoder)",
        "grade (LLM judge)",
        "web_search (Corrective RAG)",
        "token_budget",
        "generate",
      ],
      framework: "LangGraph",
      sdk: "Agent SDK (orchestrator + handoff)",
    },
  });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const mode = (req.body.mode as RetrievalMode) || "balanced";
    const result = await ingest(req.file.path, req.file.originalname, mode);
    res.json(result);
  } catch (err: any) {
    console.error("Ingestion Error:", err);
    const message = err?.message || "Upload failed";
    res.status(500).json({ error: message });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { docId, question, mode, threadId } = req.body;
    if (!docId || !question) return res.status(400).json({ error: "Missing data" });

    const result = await ask(docId, question, mode || "balanced", threadId);
    res.json({
      answer: result.answer,
      metrics: result.metrics,
      mode: result.mode,
      rewrittenQuery: result.rewrittenQuery,
      subQueries: result.subQueries,
      usedWebSearch: result.usedWebSearch,
      isRelevant: result.isRelevant,
      tokenInfo: result.tokenInfo,
      agentHandoffs: result.agentHandoffs,
      lifecycle: result.lifecycle,
      sdkAgents: result.sdkAgents,
      threadId: result.threadId,
    });
  } catch (err) {
    console.error("Ask Error:", err);
    res.status(500).json({ error: "Thinking failed" });
  }
});

/** Resume a prior conversation thread via LangGraph checkpointing. */
app.get("/api/thread/:threadId", async (req, res) => {
  try {
    const state = await compiledGraph.getState({
      configurable: { thread_id: req.params.threadId },
    });
    res.json({ threadId: req.params.threadId, state: state.values });
  } catch (err) {
    res.status(404).json({ error: "Thread not found" });
  }
});

app.listen(3000, async () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("📊 Pipeline: LangGraph + Agent SDK + Advanced RAG");

  const health = await checkQdrantHealth();
  if (health.ok) {
    console.log(`✅ Qdrant connected: ${health.url}`);
  } else {
    console.error(`❌ Qdrant unavailable: ${health.url}`);
    console.error(`   ${health.hint}`);
  }
});
