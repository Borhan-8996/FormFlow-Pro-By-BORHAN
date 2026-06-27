var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_express_rate_limit = require("express-rate-limit");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var DB_FILE = process.env.DB_FILE_PATH ? import_path.default.resolve(process.env.DB_FILE_PATH) : import_path.default.join(process.cwd(), "db.json");
var UPLOADS_DIR = process.env.UPLOADS_DIR_PATH ? import_path.default.resolve(process.env.UPLOADS_DIR_PATH) : import_path.default.join(process.cwd(), "uploads");
var EXCEL_DIR = process.env.EXCEL_DIR_PATH ? import_path.default.resolve(process.env.EXCEL_DIR_PATH) : import_path.default.join(process.cwd(), "excel_storage");
var BACKUP_DIR = process.env.BACKUP_DIR_PATH ? import_path.default.resolve(process.env.BACKUP_DIR_PATH) : import_path.default.join(process.cwd(), "backups");
[UPLOADS_DIR, EXCEL_DIR, BACKUP_DIR].forEach((dir) => {
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
});
var ENABLE_BACKUPS = process.env.ENABLE_BACKUPS !== "false";
var BACKUP_INTERVAL_MS = process.env.BACKUP_INTERVAL_MS ? parseInt(process.env.BACKUP_INTERVAL_MS, 10) : 864e5;
if (ENABLE_BACKUPS) {
  setInterval(() => {
    try {
      if (import_fs.default.existsSync(DB_FILE)) {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        const backupPath = import_path.default.join(BACKUP_DIR, `db_backup_${timestamp}.json`);
        import_fs.default.copyFileSync(DB_FILE, backupPath);
        console.log(`[BACKUP SUCCESS] Created auto backup of database at ${backupPath}`);
        const files = import_fs.default.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("db_backup_") && f.endsWith(".json")).map((f) => ({ name: f, time: import_fs.default.statSync(import_path.default.join(BACKUP_DIR, f)).mtime.getTime() })).sort((a, b) => b.time - a.time);
        if (files.length > 10) {
          files.slice(10).forEach((f) => {
            import_fs.default.unlinkSync(import_path.default.join(BACKUP_DIR, f.name));
            console.log(`[BACKUP ROTATION] Cleared old backup file: ${f.name}`);
          });
        }
      }
    } catch (err) {
      console.error("[BACKUP ERROR] Automatic backup task failed:", err);
    }
  }, BACKUP_INTERVAL_MS);
}
var initialDb = {
  users: [],
  forms: [],
  responses: [],
  excelSyncs: []
};
function readDB() {
  try {
    if (!import_fs.default.existsSync(DB_FILE)) {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
      return initialDb;
    }
    const data = import_fs.default.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Database read error, recovering with default schema", err);
    return initialDb;
  }
}
function writeDB(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Database write error", err);
  }
}
var JWT_SECRET = process.env.JWT_SECRET || "formflow_secret_key_ultra_secure_2026";
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1e3 })).toString("base64url");
  const signature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expectedSignature = import_crypto.default.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
function hashPassword(password) {
  return import_crypto.default.createHash("sha256").update(password).digest("hex");
}
app.use((0, import_compression.default)());
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        ...import_helmet.default.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://api.qrserver.com"],
        "script-src-attr": ["'unsafe-inline'"]
      }
    } : false,
    // Disable CSP in dev to avoid blocking Vite Dev Server scripts/styles
    crossOriginEmbedderPolicy: false
  })
);
var corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  (0, import_cors.default)({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()),
    credentials: true
  })
);
app.use((req, res, next) => {
  const start2 = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start2;
    console.log(
      `[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});
var apiLimiter = (0, import_express_rate_limit.rateLimit)({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 9e5,
  // default 15 minutes
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 1e3,
  // default 1000 requests per window
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", apiLimiter);
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
function authMiddleware(req, res, next) {
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
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  const db = readDB();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "Email address is already registered." });
  }
  const newUser = {
    id: import_crypto.default.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const token = generateToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});
app.get("/api/forms", authMiddleware, (req, res) => {
  const db = readDB();
  const userForms = db.forms.filter((f) => f.userId === req.user.userId);
  const formsWithCount = userForms.map((form) => {
    const formResponses = db.responses.filter((r) => r.formId === form.id);
    return {
      ...form,
      responsesCount: formResponses.length
    };
  });
  res.json(formsWithCount);
});
app.post("/api/forms", authMiddleware, (req, res) => {
  const { title, description, questions, settings, theme } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Form title is required." });
  }
  const db = readDB();
  const newForm = {
    id: import_crypto.default.randomUUID(),
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    viewCount: 0
  };
  db.forms.push(newForm);
  writeDB(db);
  res.status(201).json(newForm);
});
app.get("/api/forms/:id", authMiddleware, (req, res) => {
  const db = readDB();
  const form = db.forms.find((f) => f.id === req.params.id && f.userId === req.user.userId);
  if (!form) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }
  res.json(form);
});
app.put("/api/forms/:id", authMiddleware, (req, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f) => f.id === req.params.id && f.userId === req.user.userId);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }
  const { title, description, questions, settings, theme } = req.body;
  db.forms[formIndex] = {
    ...db.forms[formIndex],
    title: title !== void 0 ? title : db.forms[formIndex].title,
    description: description !== void 0 ? description : db.forms[formIndex].description,
    questions: questions !== void 0 ? questions : db.forms[formIndex].questions,
    settings: settings !== void 0 ? settings : db.forms[formIndex].settings,
    theme: theme !== void 0 ? theme : db.forms[formIndex].theme,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeDB(db);
  res.json(db.forms[formIndex]);
});
app.delete("/api/forms/:id", authMiddleware, (req, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f) => f.id === req.params.id && f.userId === req.user.userId);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }
  db.forms.splice(formIndex, 1);
  db.responses = db.responses.filter((r) => r.formId !== req.params.id);
  writeDB(db);
  res.json({ message: "Form and all its responses deleted successfully." });
});
app.get("/api/forms/:id/public", (req, res) => {
  const db = readDB();
  const formIndex = db.forms.findIndex((f) => f.id === req.params.id);
  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found." });
  }
  const form = db.forms[formIndex];
  form.viewCount = (form.viewCount || 0) + 1;
  writeDB(db);
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
  const form = db.forms.find((f) => f.id === req.params.id);
  if (!form) {
    return res.status(404).json({ error: "Form not found." });
  }
  if (form.settings && !form.settings.isActive) {
    return res.status(400).json({ error: form.settings.closeMessage || "This form is closed." });
  }
  const currentResponses = db.responses.filter((r) => r.formId === req.params.id).length;
  if (form.settings && form.settings.limitResponses > 0 && currentResponses >= form.settings.limitResponses) {
    return res.status(400).json({ error: "This form has reached its response limit." });
  }
  const newResponse = {
    id: import_crypto.default.randomUUID(),
    formId: req.params.id,
    answers,
    language: language || "EN",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.responses.push(newResponse);
  writeDB(db);
  if (form.settings && form.settings.emailNotification) {
    console.log(`
============== [EMAIL NOTIFICATION SENT] ==============`);
    console.log(`FROM: FormFlow Pro Platform <noreply@formflowpro.com>`);
    console.log(`TO: Developer <creator@formflowpro.com>`);
    console.log(`SUBJECT: New Submission on your Form: "${form.title}"`);
    console.log(`BODY: A new user response was received at ${newResponse.submittedAt}.`);
    console.log(`DATA COMPILATION:`, JSON.stringify(answers, null, 2));
    console.log(`=======================================================
`);
  }
  res.status(201).json({ message: "Response submitted successfully!", id: newResponse.id });
});
app.get("/api/forms/:id/responses", authMiddleware, (req, res) => {
  const db = readDB();
  const form = db.forms.find((f) => f.id === req.params.id && f.userId === req.user.userId);
  if (!form) {
    return res.status(404).json({ error: "Form not found or access denied." });
  }
  const formResponses = db.responses.filter((r) => r.formId === req.params.id);
  res.json(formResponses);
});
app.post("/api/upload", (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: "fileName and base64 fileData are required." });
  }
  try {
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileId = import_crypto.default.randomUUID();
    const extension = import_path.default.extname(fileName) || ".png";
    const savedFileName = `${fileId}${extension}`;
    const filePath = import_path.default.join(UPLOADS_DIR, savedFileName);
    import_fs.default.writeFileSync(filePath, buffer);
    res.json({ url: `/uploads/${savedFileName}` });
  } catch (error) {
    res.status(500).json({ error: `File upload failed: ${error.message}` });
  }
});
app.use("/uploads", import_express.default.static(UPLOADS_DIR));
app.use((err, req, res, next) => {
  console.error(`[SERVER ERROR] ${(/* @__PURE__ */ new Date()).toISOString()} - ${err.stack || err.message || err}`);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || "An unexpected server error occurred.",
      status
    }
  });
});
var isProduction = process.env.NODE_ENV === "production";
async function start() {
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER START] FormFlow Pro running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
