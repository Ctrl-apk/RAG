import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";

/** LangChain PromptTemplates for each pipeline stage. */
export const rewritePrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "Rewrite the user question into a search-optimized query for document retrieval. " +
      "Return ONLY the rewritten query."
  ),
  HumanMessagePromptTemplate.fromTemplate("{query}"),
]);

export const subQueryPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "Decompose the question into up to {maxSubQueries} focused sub-queries, one per line."
  ),
  HumanMessagePromptTemplate.fromTemplate("{query}"),
]);

export const hydePrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "Write a short hypothetical passage (2-3 sentences) that would answer the question " +
      "as if it appeared in a reference document."
  ),
  HumanMessagePromptTemplate.fromTemplate("{query}"),
]);

export const graderPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "Grade whether the retrieved document is relevant to the user question. " +
      "Respond ONLY with 'yes' or 'no'."
  ),
  HumanMessagePromptTemplate.fromTemplate(
    "Retrieved document:\n\n{context}\n\nUser question: {query}"
  ),
]);

export const answerPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "You are a professional assistant. Answer using ONLY the provided context. " +
      "If the answer isn't there, say you don't know."
  ),
  HumanMessagePromptTemplate.fromTemplate("Context: {context}\n\nQuestion: {query}"),
]);
