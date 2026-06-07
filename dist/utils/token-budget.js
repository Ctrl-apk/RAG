/** Rough token estimator (~4 chars per token for English). */
export function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Enforces context-window limits by truncating chunks from the end.
 * Demonstrates the context-window & token bottleneck tradeoff.
 */
export function applyTokenBudget(chunks, maxTokens) {
    const selected = [];
    let used = 0;
    for (const chunk of chunks) {
        const chunkTokens = estimateTokens(chunk);
        if (used + chunkTokens > maxTokens)
            break;
        selected.push(chunk);
        used += chunkTokens;
    }
    const fullText = chunks.join("\n\n");
    const finalText = selected.join("\n\n");
    return {
        text: finalText,
        originalTokens: estimateTokens(fullText),
        finalTokens: estimateTokens(finalText),
        truncated: selected.length < chunks.length,
        droppedChunks: chunks.length - selected.length,
    };
}
