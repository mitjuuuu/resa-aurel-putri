import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("nexuspdf.db");
const JWT_SECRET = process.env.JWT_SECRET || "nexus-super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content_json TEXT,
    owner_id INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS research_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    results TEXT,
    owner_id INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      const info = stmt.run(name, email, hashedPassword);
      const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, name, email } });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  // --- Research & AI Routes ---
  app.post("/api/research/search", authenticate, async (req, res) => {
    const { query } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Research the following topic and provide a list of key findings with sources: ${query}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const results = response.text;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      // Save to history
      db.prepare("INSERT INTO research_history (keyword, results, owner_id) VALUES (?, ?, ?)")
        .run(query, JSON.stringify({ text: results, sources }), (req as any).user.id);

      res.json({ text: results, sources });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Research failed" });
    }
  });

  app.post("/api/research/summarize", authenticate, async (req, res) => {
    const { content } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following content into: 1. Short summary, 2. Academic summary, 3. Key points. Content: ${content}`,
      });
      res.json({ summary: response.text });
    } catch (err) {
      res.status(500).json({ error: "Summarization failed" });
    }
  });

  app.post("/api/research/citation", authenticate, async (req, res) => {
    const { source, format } = req.body; // format: APA, MLA, Chicago
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a citation in ${format} format for this source: ${JSON.stringify(source)}`,
      });
      res.json({ citation: response.text });
    } catch (err) {
      res.status(500).json({ error: "Citation generation failed" });
    }
  });

  // --- Document Routes ---
  app.post("/api/documents", authenticate, (req, res) => {
    const { title, contentJson } = req.body;
    const stmt = db.prepare("INSERT INTO documents (title, content_json, owner_id) VALUES (?, ?, ?)");
    const info = stmt.run(title, JSON.stringify(contentJson), (req as any).user.id);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/documents", authenticate, (req, res) => {
    const docs = db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY updatedAt DESC").all((req as any).user.id);
    res.json(docs);
  });

  app.put("/api/documents/:id", authenticate, (req, res) => {
    const { title, contentJson } = req.body;
    db.prepare("UPDATE documents SET title = ?, content_json = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?")
      .run(title, JSON.stringify(contentJson), req.params.id, (req as any).user.id);
    res.json({ success: true });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
