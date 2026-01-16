const sqlite3 = require('sqlite3').verbose();
const { pool, initDB } = require('./db_pg');

// Connect to SQLite
const sqliteDB = new sqlite3.Database('./store_rating.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("❌ SQLite Connection Error:", err.message);
    else console.log("✅ Connected to SQLite");
});

const getRows = (query) => {
    return new Promise((resolve, reject) => {
        sqliteDB.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const migrate = async () => {
    try {
        console.log("⏳ Starting Migration Sequence...");

        // 1. Initialize Postgres Tables
        await initDB();

        // 2. Migrate Users first (referenced by Stores and Ratings)
        const users = await getRows("SELECT * FROM users");
        console.log(`🚀 Migrating ${users.length} Users...`);
        for (const row of users) {
            try {
                await pool.query(
                    `INSERT INTO users (id, name, email, password, address, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.name, row.email, row.password_hash, row.address, row.role]
                );
            } catch (pgErr) {
                console.error(`Failed to migrate user ${row.email}:`, pgErr.message);
            }
        }

        // 3. Migrate Stores next (referenced by Ratings)
        console.log("✅ Users Done. Migrating Stores...");
        const stores = await getRows("SELECT * FROM stores");
        console.log(`🚀 Migrating ${stores.length} Stores...`);
        for (const row of stores) {
            try {
                const lat = row.latitude || null;
                const lon = row.longitude || null;
                await pool.query(
                    `INSERT INTO stores (id, name, address, email, owner_id, overall_rating, total_ratings, latitude, longitude) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.name, row.address, row.email, row.owner_id, row.overall_rating || 0, row.total_ratings || 0, lat, lon]
                );
            } catch (pgErr) {
                console.error(`Failed to migrate store ${row.name}:`, pgErr.message);
            }
        }

        // 4. Migrate Ratings last
        console.log("✅ Stores Done. Migrating Ratings...");
        const ratings = await getRows("SELECT * FROM ratings");
        console.log(`🚀 Migrating ${ratings.length} Ratings...`);
        for (const row of ratings) {
            try {
                await pool.query(
                    `INSERT INTO ratings (id, user_id, store_id, rating, comment, timestamp) 
                     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.user_id, row.store_id, row.rating, row.comment, row.created_at]
                );
            } catch (pgErr) {
                console.error(`Failed to migrate rating ${row.id}:`, pgErr.message);
            }
        }

        console.log("🏁 Migration Complete successfully!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
};

migrate();
