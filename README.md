# Store Rating Platform

A full-stack web application for rating stores with role-based access control.

## Features

- **Three User Roles**: Admin, Normal User, Store Owner
- **Store Rating System**: 1-5 star ratings
- **Admin Dashboard**: View statistics, manage users and stores
- **User Features**: Rate stores, update profile, search stores
- **Store Owner Panel**: View ratings, see average scores

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT-based

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

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

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
