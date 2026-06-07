import { HfInference } from "@huggingface/inference";
import { env } from "../env.js";
import { LLM_MODEL } from "../config.js";
const hf = new HfInference(env.HUGGINGFACEHUB_API_KEY);
export async function chat(system, user, opts = {}) {
    const response = await hf.chatCompletion({
        model: LLM_MODEL,
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.1,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
}
export { hf };
