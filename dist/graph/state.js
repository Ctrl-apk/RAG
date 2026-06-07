import { Annotation } from "@langchain/langgraph";
/** LangGraph shared state — flows through all nodes and edges. */
export const GraphState = Annotation.Root({
    docId: (Annotation),
    query: (Annotation),
    mode: (Annotation),
    threadId: (Annotation),
    rewrittenQuery: (Annotation),
    subQueries: (Annotation),
    retrievedChunks: (Annotation),
    rerankedChunks: (Annotation),
    contextText: (Annotation),
    isRelevant: (Annotation),
    usedWebSearch: (Annotation),
    answer: (Annotation),
    metrics: (Annotation),
    agentHandoffs: Annotation({
        reducer: (prev, next) => [...(prev ?? []), ...(next ?? [])],
        default: () => [],
    }),
    tokenInfo: (Annotation),
});
