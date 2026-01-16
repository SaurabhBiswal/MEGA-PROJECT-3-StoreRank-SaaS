# 🚀 Deployment & DevOps Guide

This guide covers how to deploy the Premium Store Rating App using modern DevOps practices, including Docker containerization and CI/CD pipelines.

## 🐳 Docker Containerization

Run the entire application (Frontend + Backend) locally in isolated containers.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Build and Run
In the project root directory, run:

```bash
docker-compose up --build
```

- **Frontend**: Accessed at `http://localhost:3000`
- **Backend**: Accessed at `http://localhost:5000`
- **Hot Reload**: The configuration currently runs production builds. For development with hot-reload, execute `npm start` in local terminals instead.

### 2. Stop Containers
```bash
docker-compose down
```

---

## 🔄 CI/CD with GitHub Actions

Automate your testing and deployment. A workflow file is located at `.github/workflows/deploy.yml`.

### Setup
1. Push this repository to GitHub.
2. Go to **Settings > Secrets and variables > Actions**.
3. Add the following secrets if deploying to cloud providers:
   - `RENDER_API_KEY`: Your Render API Key (for Backend).
   - `RENDER_SERVICE_ID`: The service ID from Render dashboard.
   - `VERCEL_TOKEN`: Token from Vercel Account Settings.

---

## ☁️ Cloud Deployment Guide

### A. Frontend (Vercel) - Recommended ⚡
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to frontend: `cd frontend`
3. Deploy: `vercel`
4. Follow the prompts. Set `Output Directory` to `build`.
5. **Environment Variables**: Go to Vercel Dashboard > Settings > Environment Variables and add `REACT_APP_API_URL` pointing to your deployed backend URL.

### B. Backend (Render/Railway) 🚂
1. Create a new "Web Service" on [Render.com](https://render.com/).
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. **Environment Variables**: Add your database URL (Aiven), Redis URL (Upstash), and JWT_SECRET.

---

## 🌐 Custom Domain Setup

To make your app look professional (e.g., `www.storerank.com`):

### 1. Buy a Domain
Use providers like **Namecheap**, **GoDaddy**, or **Google Domains**.

### 2. Configure DNS (for Vercel Frontend)
1. Go to Vercel Dashboard > View Project > Domains.
2. Add your custom domain (e.g., `storerank.com`).
3. Vercel will verify it. You may need to add a **CNAME** record or **A Record** in your domain provider's DNS settings pointing to Vercel's IP.

### 3. Backend API Domain (Optional)
If you want `api.storerank.com`:
1. Add the domain in Render/Railway settings.
2. Add the corresponding CNAME record in your DNS provider.
3. Update `REACT_APP_API_URL` in Vercel to use the new custom API domain.

---

## 🛡️ Production Checklist
- [ ] Ensure `NODE_ENV` is set to `production`.
- [ ] Use strong, unique `JWT_SECRET` keys.
- [ ] Enable SSL (HTTPS) - Vercel/Render do this automatically.
- [ ] Verify `cors` settings in `server.js` allow only your frontend domain.
