import fs from "fs";
import pdf from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import { env } from "./env";

const client = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  checkCompatibility: false,
  timeout: 60000 // Give the network 60 seconds to find the host
});

const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: env.HUGGINGFACEHUB_API_KEY,
  model: "BAAI/bge-small-en-v1.5", 
});

// Changed to v3 to ensure a clean start with the new indexing logic
const COLLECTION_NAME = "hf_rag_v3"; 

async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`Creating collection: ${COLLECTION_NAME}`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: { size: 384, distance: "Cosine" },
      });

      console.log("Creating payload index for docId...");
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: "docId",
        field_schema: "keyword",
        wait: true,
      });
    }
  } catch (error: any) {
    if (error.status === 409) return;
    throw error;
  }
}

export async function ingest(filePath: string, filename: string) {
  await ensureCollection();
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600, // Slightly smaller for better precision on names/details
    chunkOverlap: 100
  });

  const chunks = await splitter.createDocuments([data.text]);
  const docId = randomUUID();

  console.log(`🚀 Embedding ${chunks.length} chunks...`);

  const points = await Promise.all(
    chunks.map(async (chunk) => {
      const vector = await embeddings.embedQuery(chunk.pageContent);
      return {
        id: randomUUID(),
        vector,
        payload: { text: chunk.pageContent, docId, filename }
      };
    })
  );

  await client.upsert(COLLECTION_NAME, { wait: true, points });
  return { docId, chunks: chunks.length };
}

export async function retrieve(docId: string, query: string) {
  const queryVector = await embeddings.embedQuery(query);
  const result = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: 5,
    filter: { must: [{ key: "docId", match: { value: docId } }] }
  });
  return result.map((r) => r.payload?.text as string || "");
}