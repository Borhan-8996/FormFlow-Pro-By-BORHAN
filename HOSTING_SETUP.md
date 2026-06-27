# 🌐 Hosting Setup Guide

A comprehensive, step-by-step tutorial for deploying FormFlow Pro on a cloud VPS (e.g., DigitalOcean, AWS EC2, Linode, Vultr) running **Ubuntu 22.04 LTS**.

---

## 🏗️ Step 1: Initialize the Server & Security

1. **Update and upgrade system packages**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure the Uncomplicated Firewall (UFW)**:
   ```bash
   # Allow standard SSH, HTTP, and HTTPS ports
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp

   # Enable firewall
   sudo ufw enable
   sudo ufw status
   ```

---

## 📦 Step 2: Install Runtime Environments

### Option A: Standard Node.js & PM2 Stack

1. **Install Node.js 20**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Verify installation**:
   ```bash
   node -v # Should display v20.x.x
   npm -v
   ```

3. **Install PM2 process manager globally**:
   ```bash
   sudo npm install pm2 -g
   ```

---

### Option B: Docker Engine & Compose Stack

If you prefer deploying with Docker, install the Docker Engine instead of Node.js locally:

```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

---

## 🚀 Step 3: Clone, Configure, and Build

1. **Create application folder and grant ownership**:
   ```bash
   sudo mkdir -p /var/www/formflow-pro
   sudo chown -R $USER:$USER /var/www/formflow-pro
   ```

2. **Clone the repository**:
   ```bash
   git clone <your-git-repository-url> /var/www/formflow-pro
   cd /var/www/formflow-pro
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Edit the file and set a high-strength random sequence for `JWT_SECRET`.*

4. **Install packages and compile building outputs**:
   ```bash
   npm install
   npm run build
   ```

5. **Start Application Processes**:
   - **For PM2**:
     ```bash
     pm2 start ecosystem.config.cjs
     pm2 save
     pm2 startup
     ```
   - **For Docker Compose**:
     ```bash
     docker compose up -d --build
     ```

---

## 🔒 Step 4: Reverse Proxy Nginx & SSL Setup

We will configure Nginx to route external requests safely to port `3000` inside your system, and terminate SSL securely.

1. **Install Nginx**:
   ```bash
   sudo apt install nginx -y
   ```

2. **Create custom site configuration block**:
   ```bash
   sudo nano /etc/nginx/sites-available/formflow
   ```

3. **Paste the reverse-proxy schema (replace `yourdomain.com` with your real domain name)**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Max body size mapping form uploads up to 50MB
       client_max_body_size 55M;

       # Gzip settings
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

       # Proxy static frontend and backend routes
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Enable configuration and test Nginx**:
   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/formflow /etc/nginx/sites-enabled/

   # Remove default nginx template site
   sudo rm /etc/nginx/sites-enabled/default

   # Test configuration syntactic correctness
   sudo nginx -t

   # Reload Nginx server
   sudo systemctl reload nginx
   ```

5. **Obtain Free Let's Encrypt SSL Certificates via Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
   *Follow the interactive instructions. Certbot will automatically configure SSL termination and redirect all HTTP traffic to HTTPS.*

6. **Verify auto-renewal of certificates**:
   ```bash
   sudo systemctl status certbot.timer
   sudo certbot renew --dry-run
   ```

---

## 📈 Step 5: Routine Maintenance Tasks

### Backups Management
The application auto-backs up your database to `./backups/` periodically based on your config. To sync these backups off-site safely:
```bash
# Example rsync cronjob command to copy backups to an external server daily at midnight
0 0 * * * rsync -avz /var/www/formflow-pro/backups/ user@backup-server:/backups/formflow-pro/
```

### Checking Application Logs
- **If using PM2**: `pm2 logs formflow-pro`
- **If using Docker Compose**: `docker compose logs -f`
- **Nginx HTTP logs**: `tail -f /var/log/nginx/access.log`
- **Nginx Error logs**: `tail -f /var/log/nginx/error.log`
