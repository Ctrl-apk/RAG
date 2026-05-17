import dotenv from "dotenv";
dotenv.config();
export const env = {
    HUGGINGFACEHUB_API_KEY: process.env.HUGGINGFACEHUB_API_KEY,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY
};
