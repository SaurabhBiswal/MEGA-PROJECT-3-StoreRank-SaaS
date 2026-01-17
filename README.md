# 💎 StoreRank SaaS - Store Rating Platform

**GitHub:** [MEGA-PROJECT-3-StoreRank-SaaS](https://github.com/SaurabhBiswal/MEGA-PROJECT-3-StoreRank-SaaS)

A production-ready, full-stack store rating platform with real-time updates, Google Maps integration, and enterprise-grade architecture.

## 🌐 Live Demo

- **Frontend (Netlify)**: [https://chimerical-torrone-c2dab3.netlify.app](https://chimerical-torrone-c2dab3.netlify.app)
- **Backend API (Render)**: [https://storerank-backend.onrender.com](https://storerank-backend.onrender.com)

---

## 📝 Engineering Journey: Building StoreRank SaaS

Here's a breakdown of the **real technical challenges** I faced while building this platform and how I solved them. These aren't just textbook problems - they're the actual roadblocks that came up during development.

### 1. The "Map Pin is in the Wrong Place!" Problem 📍

**What happened:**
When users entered store addresses, the map pin would often drop at some random landmark miles away. Like someone entering "Pizza Hut in Delhi" would get a pin at India Gate instead of the actual store location.

**How I fixed it:**
- Realized the issue: Geocoding APIs prioritize text matches over location. "Ideal Cafe" in Delhi might match a cafe in Kerala with the same name!
- Added location context: Started passing the user's current map view to search within that area first
- Created a fallback system: If exact address fails, find the neighborhood and let users drag the pin to exact spot
- Learned to accept "good enough" precision in real-world apps

### 2. From "Fake Login" to Real Security 🔐

**What happened:**
My first version just stored user ID in localStorage (like many tutorials show). Then I realized anyone could change it to "admin" and get full access!

**How I fixed it:**
- Switched to JWT tokens (took me 2 days to understand how they work)
- Built authentication middleware for Express
- Added proper role checking on backend (not just frontend)
- The "aha moment" was realizing backend must verify EVERY request

### 3. "Oops, I Need to Add New Fields" 🗄️

**What happened:**
Halfway through, I realized stores needed latitude/longitude coordinates. But users had already added stores without them!

**How I fixed it:**
- Wrote a smart database script that checks if columns exist before creating them
- Made the app self-healing: if you deploy fresh, it creates all tables; if upgrading, it adds missing columns
- This taught me about database migrations the hard way

### 4. Making it Feel "Live" ⚡

**What happened:**
Users would rate a store, but admins had to refresh page to see updates. Felt like 90s websites!

**How I fixed it:**
- Added Socket.IO for real-time updates
- When someone rates a store, server sends update to all connected admins/owners
- Took some debugging to get the events right, but now it feels like a modern app

### 5. From Ugly to "Wow" 🎨

**What happened:**
First version used browser `alert()` and `prompt()` boxes. Looked terrible!

**How I fixed it:**
- Learned Tailwind CSS (game changer!)
- Built proper modals with animations
- Added loading states everywhere
- Implemented dark/light mode toggle (users love this)

### 6. The Cloud Database Nightmare ☁️

**What happened:**
SQLite worked locally, but crashed on cloud. Tried PostgreSQL, got SSL errors. Tried to migrate data, foreign keys broke.

**How I fixed it:**
- Wrote a migration script that transfers data in correct order
- Fixed SSL issues by learning about cloud database configurations
- Now the app works locally AND on cloud with same code

### 7. Making it Fast with 1000+ Stores 🚀

**What happened:**
With 50+ stores, page load became slow. Database joins for ratings took forever.

**How I fixed it:**
- Added Redis caching (first time using it!)
- Caches store lists for 5 minutes
- Clears cache when new rating comes in
- Page loads went from 2 seconds to 200ms

### 8. Users Hated Logging In Every Hour 😤

**What happened:**
JWT tokens expired every hour (secure but annoying). Users complained.

**How I fixed it:**
- Implemented refresh tokens (last 7 days)
- Built axios interceptors that auto-refresh tokens
- Users stay logged in for a week, but tokens still secure

### 9. Email Notifications that Don't Break Things 📧

**What happened:**
Added email notifications, but if email failed, the whole rating submission failed.

**How I fixed it:**
- Made emails "fire and forget" - send them in background
- Rating saves first, then tries to send email
- Even if email fails, user sees "Rating saved successfully"

### 10. "Can I Download This as PDF?" 📄

**What happened:**
Store owners wanted to download their ratings report.

**How I fixed it:**
- Used PDFKit to generate PDFs on backend
- Added CSV export too
- Same data powers charts, tables, AND exports

### 11. Adding GraphQL Without Breaking REST 🔄

**What happened:**
Wanted to learn GraphQL but didn't want to rewrite everything.

**How I fixed it:**
- Added `/api/graphql` endpoint alongside existing REST API
- Same database queries, just different response format
- Can explore with GraphiQL in development

### 12. Google Maps vs Budget 💰

**What happened:**
Wanted Google Maps polish, but API key costs money.

**How I fixed it:**
- Made Google Maps optional
- If no API key provided, uses free OpenStreetMap
- App works either way - no breaking

### 13. "Works on My Machine" Syndrome 🐳

**What happened:**
App worked locally, Docker build failed. Dependencies clashed.

**How I fixed it:**
- Fixed Dockerfiles to install build tools
- Used multi-stage builds to reduce image size
- Now builds reliably everywhere

---

## 🎯 What I Learned

- Real apps have messy problems that tutorials don't cover
- Security is hard but necessary
- Performance matters at scale
- User experience is everything
- Always have fallbacks and error handling

This project went from **"I can follow a tutorial"** to **"I can solve real problems"** level. Each challenge taught me something new about building production-ready applications.

---

## 🚀 Features

- **Three User Roles**: Admin, Normal User, Store Owner
- **Real-time Rating Updates**: Socket.IO powered live dashboards
- **Interactive Maps**: Google Maps with custom markers (OpenStreetMap fallback)
- **Smart Geocoding**: Address-to-coordinates with drag-to-adjust
- **JWT Authentication**: Refresh tokens for seamless UX
- **Cloud-Ready**: PostgreSQL + Redis caching
- **Export Reports**: PDF and CSV downloads
- **GraphQL + REST**: Dual API support
- **Docker Ready**: One-command deployment

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Framer Motion, Google Maps API,Chart.js
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: PostgreSQL (Aiven) + Redis (Upstash)
- **Authentication**: JWT + Refresh Tokens
- **DevOps**: Docker, Docker Compose, GitHub Actions
- **Maps**: Google Maps API (with OpenStreetMap fallback)

## 📦 Quick Start

### Using Docker (Recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Manual Setup

**Backend:**
```bash
cd backend
npm install
node server.js
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 🔑 Default Login Credentials

- **Admin**: `admin@test.com` / `Admin@123`
- **User**: `user@test.com` / `User@123`
- **Store Owner**: `owner@test.com` / `Owner@123`

## 📚 Documentation

- [CHALLENGES.md](./CHALLENGES.md) - Technical deep-dives and interview prep
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Cloud deployment guide

## 👨‍💻 Author

**Saurabh Biswal**
- 📧 Email: punpunsaurabh2002@gmail.com
- 📱 Phone: 7428126826
- 🔗 GitHub: [@SaurabhBiswal](https://github.com/SaurabhBiswal)
