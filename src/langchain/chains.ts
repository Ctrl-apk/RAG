import { RunnableSequence } from "@langchain/core/runnables";
import { createChatModel } from "./llm.js";
import {
  rewritePrompt,
  subQueryPrompt,
  hydePrompt,
  graderPrompt,
  answerPrompt,
} from "./prompts.js";
import { stringParser, parseSubQueries, parseRelevance } from "./parsers.js";

/**
 * LCEL (LangChain Expression Language) chains using PromptTemplate | Model | OutputParser.
 * Demonstrates the Runnable pipe pattern: chain.invoke(input) → output.
 */

export const rewriteChain = RunnableSequence.from([
  rewritePrompt,
  createChatModel({ maxTokens: 100, temperature: 0 }),
  stringParser,
]);

export const subQueryChain = RunnableSequence.from([
  subQueryPrompt,
  createChatModel({ maxTokens: 200, temperature: 0 }),
  stringParser,
]);

export const hydeChain = RunnableSequence.from([
  hydePrompt,
  createChatModel({ maxTokens: 150, temperature: 0.3 }),
  stringParser,
]);

export const graderChain = RunnableSequence.from([
  graderPrompt,
  createChatModel({ maxTokens: 10, temperature: 0 }),
  stringParser,
]);

export const answerChain = RunnableSequence.from([
  answerPrompt,
  createChatModel({ maxTokens: 500, temperature: 0.1 }),
  stringParser,
]);

export async function runRewrite(query: string): Promise<string> {
  const result = await rewriteChain.invoke({ query });
  return result.trim() || query;
}

export async function runSubQueries(query: string, maxSubQueries: number): Promise<string[]> {
  const raw = await subQueryChain.invoke({ query, maxSubQueries });
  const parsed = parseSubQueries(raw, maxSubQueries);
  return parsed.length > 0 ? parsed : [query];
}

export async function runHyde(query: string): Promise<string> {
  return hydeChain.invoke({ query });
}

export async function runGrader(query: string, context: string): Promise<boolean> {
  const raw = await graderChain.invoke({ query, context });
  return parseRelevance(raw);
}

export async function runAnswer(query: string, context: string, maxTokens: number): Promise<string> {
  const chain = RunnableSequence.from([
    answerPrompt,
    createChatModel({ maxTokens, temperature: 0.1 }),
    stringParser,
  ]);
  return chain.invoke({ query, context });
}
