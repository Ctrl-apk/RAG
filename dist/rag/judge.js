import { chat } from "../utils/llm.js";
/** LLM judge: binary relevance grading for retrieved context. */
export async function gradeRelevance(query, context) {
    try {
        const grade = await chat("You are a grader assessing relevance of a retrieved document to a user question. " +
            "If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. " +
            "Give a binary score 'yes' or 'no'. Respond ONLY with 'yes' or 'no'.", `Retrieved document:\n\n${context}\n\nUser question: ${query}`, { maxTokens: 10, temperature: 0.0 });
        return grade.toLowerCase().includes("yes");
    }
    catch {
        return true;
    }
}
