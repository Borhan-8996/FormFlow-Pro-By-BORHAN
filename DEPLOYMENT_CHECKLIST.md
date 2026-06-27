# 📋 FormFlow Pro Production Deployment Checklist

Use this pre-flight checklist to ensure your production deployment of **FormFlow Pro** is secure, performant, stable, and persistent.

---

## 🔐 1. Environment & Security Configuration
- [ ] **Secret Strength Verification**:
  - `JWT_SECRET` is changed from defaults to a cryptographically strong random hex sequence (at least 64 characters long).
  - You can generate one with `openssl rand -hex 32` or similar.
- [ ] **Node Environment Flag**:
  - `NODE_ENV` is explicitly set to `production`.
- [ ] **Dynamic API Configuration**:
  - `VITE_API_URL` environment variable is defined in the hosting platform (e.g., `https://formflow.yourdomain.com`), or let it fall back dynamically to `/` if fully self-hosted.
- [ ] **CORS Configuration**:
  - `CORS_ORIGIN` is configured to restrict cross-origin requests specifically to your designated production domain (e.g. `https://formflow.yourdomain.com`), rather than leaving it as open wildcard `*`.
- [ ] **API Rate Limiting Settings**:
  - `RATE_LIMIT_WINDOW_MS` (e.g., `900000` = 15 mins) and `RATE_LIMIT_MAX` (e.g., `1000` requests) are tuned according to anticipated traffic density.
- [ ] **HTTPS Traffic Terminations**:
  - Direct HTTP ports (80) are redirected to secure HTTPS (443) using an SSL/TLS Certificate (e.g., Let's Encrypt).
- [ ] **No Hardcoded Secrets**:
  - Verified that no development keys, API tokens, or test credentials remain inside application logic or the git tree.

---

## 🗄️ 2. Data Persistence & File Storage
- [ ] **Storage Volume Mounts**:
  - If deploying via Docker, the container volume `formflow_prod_data` is mounted to `/app/data` to ensure data persists across restarts.
  - If deploying via VPS, write permissions are configured properly for `uploads/`, `excel_storage/`, and `backups/` directories (`chmod 755`).
- [ ] **JSON Database Persistence**:
  - `DB_FILE_PATH` is pointed to a persistent location (outside of ephemeral container directories).
- [ ] **Automated Backup Policies**:
  - `ENABLE_BACKUPS` is set to `true` inside production `.env`.
  - `BACKUP_INTERVAL_MS` is set (typically `86400000` milliseconds = 24 hours).
  - Verified that backups are running successfully and the rotated limit of 10 backups is functioning.
  - Optional offsite backup transfer via rsync/FTP is configured.

---

## 🚀 3. Process Management & Performance Tuning
- [ ] **Process Lifecycle Managers**:
  - **PM2**: Application is configured using `ecosystem.config.cjs` with `instances: "max"` and automatic clustering.
  - **Docker Compose**: Container restarting is configured with `restart: unless-stopped`.
- [ ] **Production-Grade Builds**:
  - Build has been compiled via `npm run build` and static files have successfully compiled to the `dist/` folder.
  - Backend has been bundled into `dist/server.cjs` via esbuild without compilation errors.
- [ ] **Response Optimizations**:
  - Express compression is verified (compression middleware is active).
  - Nginx configuration has gzip compression enabled.
- [ ] **Security Headers Check**:
  - Helmet middleware is active and CSP rules are set up correctly.

---

## 🩺 4. Infrastructure Health & Monitoring
- [ ] **Firewall Configurations**:
  - System firewalls (such as UFW) are configured to block all ports except SSH (22), HTTP (80), and HTTPS (443).
- [ ] **Logging & Monitoring Setup**:
  - PM2 logs or Docker container logs are writing correctly to target files without storage overflow threat.
  - Access logs and error logs in Nginx are correctly configured.
- [ ] **Maximum Body Size Constraints**:
  - Nginx `client_max_body_size` is aligned with Express payload configuration (e.g., 55MB) to handle signature and file uploads seamlessly.
