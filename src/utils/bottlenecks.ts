/** Tracks per-stage latency to surface RAG bottlenecks. */
export interface StageTiming {
  stage: string;
  durationMs: number;
}

export interface BottleneckReport {
  timings: StageTiming[];
  totalMs: number;
  slowestStage: string;
  bottleneckNote: string;
}

export class BottleneckTracker {
  private timings: StageTiming[] = [];
  private timers = new Map<string, number>();

  start(stage: string) {
    this.timers.set(stage, performance.now());
  }

  end(stage: string) {
    const start = this.timers.get(stage);
    if (start === undefined) return;
    this.timings.push({ stage, durationMs: Math.round(performance.now() - start) });
    this.timers.delete(stage);
  }

  async track<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    this.start(stage);
    try {
      return await fn();
    } finally {
      this.end(stage);
    }
  }

  report(): BottleneckReport {
    const totalMs = this.timings.reduce((sum, t) => sum + t.durationMs, 0);
    const slowest = [...this.timings].sort((a, b) => b.durationMs - a.durationMs)[0];
    const slowestStage = slowest?.stage ?? "none";
    const pct = slowest && totalMs > 0 ? Math.round((slowest.durationMs / totalMs) * 100) : 0;

    const notes: Record<string, string> = {
      embedding: "Embedding calls dominate — consider caching or a smaller model.",
      retrieval: "Vector DB search is slow — check Qdrant latency or reduce K.",
      reranking: "Cross-encoder reranking is expensive — use fast mode or fewer candidates.",
      generation: "LLM generation is the bottleneck — reduce max_tokens or context size.",
      hyde: "HyDE adds an extra LLM call per query — skip in fast mode.",
      query_rewrite: "Query rewriting adds latency — disable for speed-critical paths.",
      web_search: "External web search adds network latency.",
    };

    return {
      timings: [...this.timings],
      totalMs,
      slowestStage,
      bottleneckNote:
        notes[slowestStage] ??
        `Stage '${slowestStage}' took ${pct}% of total time (${slowest?.durationMs ?? 0}ms).`,
    };
  }
}
