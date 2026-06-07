import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { chat } from "../utils/llm.js";
/**
 * Custom LangChain ChatModel wrapping HuggingFace Inference.
 * Enables LCEL chains without a dedicated @langchain/community HF chat adapter.
 */
export class HuggingFaceChatModel extends BaseChatModel {
    maxTokens;
    temperature;
    constructor(opts = {}) {
        super({});
        this.maxTokens = opts.maxTokens ?? 300;
        this.temperature = opts.temperature ?? 0.1;
    }
    _llmType() {
        return "huggingface-inference";
    }
    async _generate(messages) {
        let system = "";
        let user = "";
        for (const msg of messages) {
            if (msg instanceof SystemMessage)
                system = String(msg.content);
            else if (msg instanceof HumanMessage)
                user = String(msg.content);
        }
        const text = await chat(system, user, {
            maxTokens: this.maxTokens,
            temperature: this.temperature,
        });
        return {
            generations: [{ text, message: new AIMessage(text) }],
        };
    }
}
export function createChatModel(opts = {}) {
    return new HuggingFaceChatModel(opts);
}
