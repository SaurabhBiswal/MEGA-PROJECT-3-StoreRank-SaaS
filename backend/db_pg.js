const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Aiven (and most cloud DBs) without custom CA
    }
});

// Initialize Tables
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                address TEXT,
                role TEXT DEFAULT 'user'
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stores (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                email TEXT,
                owner_id INTEGER REFERENCES users(id),
                overall_rating REAL DEFAULT 0,
                total_ratings INTEGER DEFAULT 0,
                latitude REAL,
                longitude REAL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                store_id INTEGER REFERENCES stores(id),
                rating INTEGER NOT NULL,
                comment TEXT,
                timestamp TEXT
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ PostgreSQL Tables Verified/Initialized");
    } catch (err) {
        console.error("❌ Error initializing tables:", err);
    }
};

module.exports = { pool, initDB };
