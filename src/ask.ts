import { HfInference } from "@huggingface/inference";
import { retrieve } from "./rag";
import { env } from "./env";

// Initialize the official client
const hf = new HfInference(env.HUGGINGFACEHUB_API_KEY);

export async function ask(docId: string, query: string) {
  const context = await retrieve(docId, query);
  if (!context.length) return "I couldn't find any relevant data in the document.";

  const contextText = context.join("\n\n");

  console.log("🤖 Asking AI via Official HF SDK...");

  try {
    // The chatCompletion method handles the /v1/chat/completions route perfectly
    const response = await hf.chatCompletion({
      // ':fastest' ensures we get a response from any available free provider
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

    const finalAnswer = response.choices[0]?.message?.content || "No response generated.";

    console.log("✅ Success!");
    return finalAnswer.trim();

  } catch (error: any) {
    console.error("HF SDK Error:", error.message);

    // Specific 2026 error handling
    if (error.message.includes("Model is overloaded")) {
        return "The AI is a bit overwhelmed right now. Please try again in 10 seconds.";
    }
    
    return "I ran into a connection issue with the AI. Please check your network and try again.";
  }
}