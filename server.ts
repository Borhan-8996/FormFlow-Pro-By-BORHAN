import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup directories and JSON Database
const DB_FILE = process.env.DB_FILE_PATH 
  ? path.resolve(process.env.DB_FILE_PATH) 
  : path.join(process.cwd(), "db.json");

const UPLOADS_DIR = process.env.UPLOADS_DIR_PATH 
  ? path.resolve(process.env.UPLOADS_DIR_PATH) 
  : path.join(process.cwd(), "uploads");

const EXCEL_DIR = process.env.EXCEL_DIR_PATH 
  ? path.resolve(process.env.EXCEL_DIR_PATH) 
  : path.join(process.cwd(), "excel_storage");

const BACKUP_DIR = process.env.BACKUP_DIR_PATH 
  ? path.resolve(process.env.BACKUP_DIR_PATH) 
  : path.join(process.cwd(), "backups");

// Ensure all essential directories exist
[UPLOADS_DIR, EXCEL_DIR, BACKUP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Automatic Daily / Configurable Backups
const ENABLE_BACKUPS = process.env.ENABLE_BACKUPS !== "false";
const BACKUP_INTERVAL_MS = process.env.BACKUP_INTERVAL_MS 
  ? parseInt(process.env.BACKUP_INTERVAL_MS, 10) 
  : 86400000; // default to 24 hours

if (ENABLE_BACKUPS) {
  setInterval(() => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(BACKUP_DIR, `db_backup_${timestamp}.json`);
        fs.copyFileSync(DB_FILE, backupPath);
        console.log(`[BACKUP SUCCESS] Created auto backup of database at ${backupPath}`);

        // Rotate backups: Keep only the 10 most recent backups
        const files = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.startsWith("db_backup_") && f.endsWith(".json"))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time); // newest first

        if (files.length > 10) {
          files.slice(10).forEach(f => {
            fs.unlinkSync(path.join(BACKUP_DIR, f.name));
            console.log(`[BACKUP ROTATION] Cleared old backup file: ${f.name}`);
          });
        }
      }
    } catch (err) {
      console.error("[BACKUP ERROR] Automatic backup task failed:", err);
    }
  }, BACKUP_INTERVAL_MS);
}

// Ensure database file exists with initial schema
const initialDb = {
  users: [],
  forms: [],
  responses: [],
  excelSyncs: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Database read error, recovering with default schema", err);
    return initialDb;
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Database write error", err);
  }
}

// HMAC-SHA256 Token Helper for custom super-stable JWT implementation
const JWT_SECRET = process.env.JWT_SECRET || "formflow_secret_key_ultra_secure_2026";

function generateToken(payload: { userId: string; email: string }) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null; // Expired
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// Password Hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Express Middleware
// 1. Enable gzip compression
app.use(compression());

// 2. Security headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://api.qrserver.com"],
        "script-src-attr": ["'unsafe-inline'"],
      },
    } : false, // Disable CSP in dev to avoid blocking Vite Dev Server scripts/styles
    crossOriginEmbedderPolicy: false,
  })
);

// 3. Dynamic CORS
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  })
);

// 4. Custom Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// 5. Rate Limiting for APIs
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS 
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) 
    : 900000, // default 15 minutes
  max: process.env.RATE_LIMIT_MAX 
    ? parseInt(process.env.RATE_LIMIT_MAX, 10) 
    : 1000, // default 1000 requests per window
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// 6. JSON & URL Encoded Body Parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
  req.user = decoded;
  next();
}

// API Routes

// --- AUTHENTICATION ---
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const db = readDB();
  const existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "Email address is already registered." });
  }

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  const token = generateToken({ userId: newUser.id, email: newUser.email });
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = generateToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  const db = readDB();
  const user = db.users.find((u: any) => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});


// --- FORM CRUD OPERATIONS ---
app.get("/api/forms", authMiddleware, (req: any, res) => {
  const db = readDB();
  const userForms = db.forms.filter((f: any) => f.userId === req.user.userId);
  
  // Count responses for each form
  const formsWithCount = userForms.map((form: any) => {
    const formResponses = db.responses.filter((r: any) => r.formId === form.id);
    return {
      ...form,
      responsesCount: formResponses.length
    };
  });
  
  res.json(formsWithCount);
});

app.post("/api/forms", authMiddleware, (req: any, res) => {
  const { title, description, questions, settings, theme } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Form title is required." });
  }

  const db = readDB();
  const newForm = {
    id: crypto.randomUUID(),
    userId: req.user.userId,
    title,
    description: description || "",
    questions: questions || [],
    settings: settings || {
      isActive: true,
      limitResponses: 0,
      closeMessage: "This form is no longer accepting responses.",
      autoExcelSync: true,
      redirectUrl: "",
      emailNotification: false,
      progressBar: false,
      ipRestriction: false,
      customSubmitText: "",
      saveLater: false,
      autoJump: false,
      passwordProtect: false,
      formPassword: ""
    },
    theme: theme || { preset: "dark-glow", glowColor: "indigo" },
    createdAt: new Date().toISOString(),
    viewCount: 0
  };

  db.forms.push(newForm);
  writeDB(db);

  res.status(201).json(newForm);
});

app.get("/api/forms/:id", authMiddleware, (req: any, res) => {
  const db = readDB();
  const form = db.forms.find((f: any) => f.id === req.params.id && f.userId === req.user.userId);
  if (!form) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }
  res.json(form);
});

app.put("/api/forms/:id", authMiddleware, (req: any, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f: any) => f.id === req.params.id && f.userId === req.user.userId);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }

  const { title, description, questions, settings, theme } = req.body;
  
  db.forms[formIndex] = {
    ...db.forms[formIndex],
    title: title !== undefined ? title : db.forms[formIndex].title,
    description: description !== undefined ? description : db.forms[formIndex].description,
    questions: questions !== undefined ? questions : db.forms[formIndex].questions,
    settings: settings !== undefined ? settings : db.forms[formIndex].settings,
    theme: theme !== undefined ? theme : db.forms[formIndex].theme,
    updatedAt: new Date().toISOString()
  };

  writeDB(db);
  res.json(db.forms[formIndex]);
});

app.delete("/api/forms/:id", authMiddleware, (req: any, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f: any) => f.id === req.params.id && f.userId === req.user.userId);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }

  // Remove form
  db.forms.splice(formIndex, 1);
  // Remove associated responses
  db.responses = db.responses.filter((r: any) => r.formId !== req.params.id);
  
  writeDB(db);
  res.json({ message: "Form and all its responses deleted successfully." });
});


// --- PUBLIC VIEW & SUBMIT ---
app.get("/api/forms/:id/public", (req, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f: any) => f.id === req.params.id);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found." });
  }

  const form = db.forms[formIndex];
  
  // Increment viewCount safely on read
  form.viewCount = (form.viewCount || 0) + 1;
  writeDB(db);

  // Return limited public details (hide sensitive creator ID, but return full form structure)
  res.json({
    id: form.id,
    title: form.title,
    description: form.description,
    questions: form.questions,
    settings: form.settings,
    theme: form.theme
  });
});

app.post("/api/forms/:id/submit", (req, res) => {
  const { answers, language } = req.body;
  if (!answers) {
    return res.status(400).json({ error: "Answers payload is required." });
  }

  const db = readDB();
  const form = db.forms.find((f: any) => f.id === req.params.id);
  if (!form) {
    return res.status(404).json({ error: "Form not found." });
  }

  if (form.settings && !form.settings.isActive) {
    return res.status(400).json({ error: form.settings.closeMessage || "This form is closed." });
  }

  // Validate response limit
  const currentResponses = db.responses.filter((r: any) => r.formId === req.params.id).length;
  if (form.settings && form.settings.limitResponses > 0 && currentResponses >= form.settings.limitResponses) {
    return res.status(400).json({ error: "This form has reached its response limit." });
  }

  const newResponse = {
    id: crypto.randomUUID(),
    formId: req.params.id,
    answers,
    language: language || "EN",
    submittedAt: new Date().toISOString()
  };

  db.responses.push(newResponse);
  writeDB(db);

  if (form.settings && form.settings.emailNotification) {
    console.log(`\n============== [EMAIL NOTIFICATION SENT] ==============`);
    console.log(`FROM: FormFlow Pro Platform <noreply@formflowpro.com>`);
    console.log(`TO: Developer <creator@formflowpro.com>`);
    console.log(`SUBJECT: New Submission on your Form: "${form.title}"`);
    console.log(`BODY: A new user response was received at ${newResponse.submittedAt}.`);
    console.log(`DATA COMPILATION:`, JSON.stringify(answers, null, 2));
    console.log(`=======================================================\n`);
  }

  res.status(201).json({ message: "Response submitted successfully!", id: newResponse.id });
});


// --- RESPONSES ---
app.get("/api/forms/:id/responses", authMiddleware, (req: any, res) => {
  const db = readDB();
  // Ensure user owns this form
  const form = db.forms.find((f: any) => f.id === req.params.id && f.userId === req.user.userId);
  if (!form) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }

  const formResponses = db.responses.filter((r: any) => r.formId === req.params.id);
  res.json(formResponses);
});


// --- FILE UPLOAD (AS BASE64 API PROXIED FOR INSTANT COMPATIBILITY) ---
app.post("/api/upload", (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: "fileName and base64 fileData are required." });
  }

  try {
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const fileId = crypto.randomUUID();
    const extension = path.extname(fileName) || ".png";
    const savedFileName = `${fileId}${extension}`;
    const filePath = path.join(UPLOADS_DIR, savedFileName);
    
    fs.writeFileSync(filePath, buffer);
    
    res.json({ url: `/uploads/${savedFileName}` });
  } catch (error: any) {
    res.status(500).json({ error: `File upload failed: ${error.message}` });
  }
});

app.use("/uploads", express.static(UPLOADS_DIR));

// Centralized Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[SERVER ERROR] ${new Date().toISOString()} - ${err.stack || err.message || err}`);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || "An unexpected server error occurred.",
      status
    }
  });
});

// Serve static frontend assets and boot server
const isProduction = process.env.NODE_ENV === "production";

async function start() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER START] FormFlow Pro running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
}

start();
