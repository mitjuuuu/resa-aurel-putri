import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

console.log("Starting NEXUSPDF Server...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  db = new Database("nexuspdf.db");
  console.log("Database initialized.");
} catch (err) {
  console.error("Failed to initialize database:", err);
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || "nexus-super-secret-key";

// Initialize Database Schema
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
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      const info = stmt.run(name, email, hashedPassword);
      const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, name, email } });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(400).json({ error: "Email already exists or invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Research History Route ---
  app.post("/api/research/history", authenticate, (req, res) => {
    const { query, results } = req.body;
    try {
      db.prepare("INSERT INTO research_history (keyword, results, owner_id) VALUES (?, ?, ?)")
        .run(query, JSON.stringify(results), (req as any).user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save history" });
    }
  });

  // --- Document Routes ---
  app.post("/api/documents", authenticate, (req, res) => {
    const { title, contentJson } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO documents (title, content_json, owner_id) VALUES (?, ?, ?)");
      const info = stmt.run(title, JSON.stringify(contentJson), (req as any).user.id);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.get("/api/documents", authenticate, (req, res) => {
    try {
      const docs = db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY updatedAt DESC").all((req as any).user.id);
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.put("/api/documents/:id", authenticate, (req, res) => {
    const { title, contentJson } = req.body;
    try {
      db.prepare("UPDATE documents SET title = ?, content_json = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?")
        .run(title, JSON.stringify(contentJson), req.params.id, (req as any).user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
