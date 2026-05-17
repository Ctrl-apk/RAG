import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { upload } from "./upload.js";
import { ingest } from "./rag.js";
import { ask } from "./ask.js";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });
        const result = await ingest(req.file.path, req.file.originalname);
        res.json(result);
    }
    catch (err) {
        console.error("Ingestion Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});
app.post("/api/ask", async (req, res) => {
    try {
        const { docId, question } = req.body;
        if (!docId || !question)
            return res.status(400).json({ error: "Missing data" });
        const answer = await ask(docId, question);
        res.json({ answer });
    }
    catch (err) {
        console.error("Ask Error:", err);
        res.status(500).json({ error: "Thinking failed" });
    }
});
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});
