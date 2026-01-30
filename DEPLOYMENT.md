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

## ☁️ Cloud Deployment Guide (Step-by-Step)

### A. Backend (Render.com) 🚂
**Backend ko pehle deploy karo kyunki Frontend ko iska URL chahiye hoga.**

1. **Dashboard**: [Render Dashboard](https://dashboard.render.com/) pe jao aur **"New Web Service"** click karo.
2. **Connect Repo**: `MEGA-PROJECT-3-StoreRank-SaaS` select karo.
3. **Settings**:
   - **Name**: `storerank-backend`
   - **Root Directory**: `backend` (🚨 Bahut Zaroori!)
   - **Runtime**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps`
   - **Start Command**: `node server.js`
4. **Environment Variables** (Section niche scroll karke):
   - `DATABASE_URL`: `postgresql://...` (Aiven se mila hua)
   - `REDIS_URL`: `redis://...` (Upstash se mila hua)
   - `JWT_SECRET`: Koi bhi strong password
   - `NODE_ENV`: `production`
5. **Create Web Service** click karo. Wait karo jab tak "Live" na likha aa jaye.
6. **Copy URL**: Top-left se Backend ka URL copy karo (e.g., `https://storerank-backend.onrender.com`).

### B. Frontend (Netlify) ⚡
1. **Dashboard**: [Netlify Dashboard](https://app.netlify.com/) pe jao aur **"Add new site" > "Import from Git"**.
2. **Connect Repo**: GitHub select karo aur `MEGA-PROJECT-3-StoreRank-SaaS` choose karo.
3. **Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `CI=false npm run build` (CI=false warning errors ignore karne ke liye)
   - **Publish directory**: `frontend/build`
4. **Environment Variables** ("Add environment variable" pe click karo):
   - Key: `REACT_APP_API_URL`
   - Value: Jo Render ka backend URL copy kiya tha (e.g., `https://storerank-backend.onrender.com`)
   - Key: `REACT_APP_GOOGLE_MAPS_API_KEY`
   - Value: Tera Google Maps Key
5. **Deploy Site** click karo.

🎉 **Bas ho gaya!** 2-3 minute mein teri site live hogi.

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
