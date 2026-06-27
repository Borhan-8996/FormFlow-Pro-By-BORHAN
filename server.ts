import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Setup directories and JSON Database
const DB_FILE = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
      customSubmitText: ""
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


// Serve static frontend assets and boot developer server
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
    console.log(`Server running at http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
}

start();
