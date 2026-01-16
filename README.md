# 💎 Store Rating App (Premium Version)

A high-performance, map-integrated store rating system. Check out our [Interview Readiness Guide (CHALLENGES.md)](./CHALLENGES.md) for technical deep-dives into the project.

## 🌐 Live Demo

- **Frontend**: https://your-app.netlify.app
- **Backend API**: https://your-backend.onrender.com

## Features

- **Three User Roles**: Admin, Normal User, Store Owner
- **Store Rating System**: 1-5 star ratings with comments
- **Admin Dashboard**: View statistics, manage users and stores
- **User Features**: Rate stores, update profile, search stores
- **Store Owner Panel**: View ratings, see average scores

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Framer Motion, Google Maps API
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL + Redis caching
- **Authentication**: JWT + Refresh Tokens
- **Real-time**: Socket.IO
- **Maps**: Google Maps API (with OpenStreetMap fallback)
- **Styling**: Tailwind CSS (glassmorphism, dark mode), Framer Motion, Lucide Icons

## Project Structure

```
store-rating-app/
├── frontend/          # React application
├── backend/           # Node.js server
```

## Setup Instructions

### Backend Setup

```bash
cd backend
npm install
node server.js
```

The backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000`

### Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL=your_postgres_connection_string
REDIS_URL=your_redis_connection_string
JWT_SECRET=your_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

**Frontend** (`frontend/.env`):
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

> **Note**: Google Maps API key is optional. If not provided, the app will use OpenStreetMap as a fallback.

## Default Login Credentials

- **Admin**: `admin@test.com` / `Admin@123`
- **User**: `user@test.com` / `User@123`
- **Store Owner**: `owner@test.com` / `Owner@123`

## API Documentation

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/stores` - Get stores with ratings
- `POST /api/ratings` - Submit rating
- `GET /api/stats` - Get dashboard statistics
- `POST /api/auth/update-password` - Update user password

## Premium UI Highlights

- **Tailwind-powered dashboards** with glassmorphism cards and responsive layout for Admin, Store Owner, and User roles.
- **Global dark mode toggle** with class-based theming persisted in `localStorage` and applied across all dashboards.
- **Animated interactions** using Framer Motion on login/registration flows, rating cards, and key analytics sections.

## Author

**Saurabh Biswal**
- 📧 Email: punpunsaurabh2002@gmail.com
- 📱 Phone: 7428126826
