import { HfInference } from "@huggingface/inference";
import { retrieve } from "./rag.js";
import { env } from "./env.js";
import wikiLib from "wikipedia";

// Handle CJS/ESM interop for the wikipedia package
const wiki = (wikiLib as any).default || wikiLib;

// Initialize the official client
const hf = new HfInference(env.HUGGINGFACEHUB_API_KEY);

async function gradeRelevance(query: string, context: string): Promise<boolean> {
  console.log("📝 Grading relevance...");
  try {
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-3.1-8B-Instruct:fastest",
      messages: [
        {
          role: "system",
          content: "You are a grader assessing relevance of a retrieved document to a user question. " +
                   "If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. " +
                   "Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question. " +
                   "Respond ONLY with 'yes' or 'no'."
        },
        {
          role: "user",
          content: `Retrieved document: \n\n ${context} \n\n User question: ${query}`
        }
      ],
      max_tokens: 10,
      temperature: 0.0,
    });
    
    const grade = (response.choices[0]?.message?.content || "no").toLowerCase().trim();
    return grade.includes("yes");
  } catch (e) {
    console.error("Grader failed, defaulting to relevant:", e);
    return true; // fail open
  }
}

async function webSearch(query: string): Promise<string> {
  try {
    // Search wikipedia and get the top result
    const searchResults = await wiki.search(query);
    if (!searchResults.results || searchResults.results.length === 0) return "No external information found.";
    
    // Get summary of the top result
    const topResult = searchResults.results[0];
    const summary = await wiki.summary(topResult.title);
    return summary.extract;
  } catch (e) {
    console.error("Web search failed:", e);
    return "Web search failed.";
  }
}

export async function ask(docId: string, query: string) {
  const context = await retrieve(docId, query);
  let contextText = context.join("\n\n");
  
  if (!contextText.trim()) {
    console.log("No initial context found from document.");
  }

  const isRelevant = contextText.trim() ? await gradeRelevance(query, contextText) : false;
  
  let usedWebSearch = false;
  if (!isRelevant) {
    console.log("⚠️ Context is irrelevant or missing. Falling back to web search (Wikipedia)...");
    contextText = await webSearch(query);
    usedWebSearch = true;
  } else {
    console.log("✅ Context is relevant.");
  }

  console.log("🤖 Generating final answer via Official HF SDK...");

  try {
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-3.1-8B-Instruct:fastest",
      messages: [
        {
          role: "system",
          content: "You are a professional assistant. Answer the question using ONLY the provided context. If the answer isn't there, say you don't know."
        },
        {
          role: "user",
          content: `Context: ${contextText}\n\nQuestion: ${query}`
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const answer = response.choices[0]?.message?.content || "No response generated.";
    
    const finalAnswer = usedWebSearch ? `${answer.trim()}\n\n*(Source: Web Search)*` : `${answer.trim()}\n\n*(Source: Document)*`;

    console.log("✅ Success!");
    return finalAnswer;

  } catch (error: any) {
    console.error("HF SDK Error:", error.message);

    // Specific 2026 error handling
    if (error.message.includes("Model is overloaded")) {
        return "The AI is a bit overwhelmed right now. Please try again in 10 seconds.";
    }
    
    return "I ran into a connection issue with the AI. Please check your network and try again.";
  }
}