import fs from "fs";
import pdf from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { randomUUID } from "crypto";
import { COLLECTION_NAME, CHUNK_PRESETS } from "../config.js";
import { embedQuery } from "./embeddings.js";
import { client, checkQdrantHealth } from "./qdrant.js";
async function ensureCollection() {
    try {
        const collections = await client.getCollections();
        const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
        if (!exists) {
            await client.createCollection(COLLECTION_NAME, {
                vectors: { size: 384, distance: "Cosine" },
            });
            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: "docId",
                field_schema: "keyword",
                wait: true,
            });
        }
    }
    catch (error) {
        if (error.status === 409)
            return;
        if (error.status === 404 || error.status === 401 || error.status === 403) {
            const health = await checkQdrantHealth();
            throw new Error(health.hint || health.error || "Cannot reach Qdrant.");
        }
        throw error;
    }
}
export async function ingest(filePath, filename, mode = "balanced") {
    await ensureCollection();
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    const chunkConfig = CHUNK_PRESETS[mode];
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: chunkConfig.chunkSize,
        chunkOverlap: chunkConfig.chunkOverlap,
    });
    const chunks = await splitter.createDocuments([data.text]);
    const docId = randomUUID();
    const points = await Promise.all(chunks.map(async (chunk) => {
        const vector = await embedQuery(chunk.pageContent);
        return {
            id: randomUUID(),
            vector,
            payload: { text: chunk.pageContent, docId, filename },
        };
    }));
    await client.upsert(COLLECTION_NAME, { wait: true, points });
    return {
        docId,
        chunks: chunks.length,
        chunkConfig,
    };
}
