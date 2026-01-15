const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const dbPath = path.join(__dirname, 'store_rating.db');
console.log('📁 Database location:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Cannot open database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

db.serialize(() => {
  console.log('📊 Checking/Creating tables...');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(LENGTH(name) >= 5 AND LENGTH(name) <= 60), 
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    address TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    owner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_id)
  )`);

  console.log('✅ Tables readiness check complete');

  db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (err) {
      console.log('Error checking users count (might be first run):', err.message);
      return;
    }

    if (row && row.count === 0) {
      console.log('User table empty. Seeding data...');
      insertData();
    } else {
      console.log('✅ Database already contains data. Skipping seed.');
    }
  });
});

function insertData() {
  console.log('📝 Inserting sample data...');
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  const userHash = bcrypt.hashSync('User@123', 10);
  const ownerHash = bcrypt.hashSync('Owner@123', 10);

  db.run(
    `INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)`,
    ['System Administrator User', 'admin@store.com', adminHash, '123 Admin St, Central City', 'admin']
  );
  db.run(
    `INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)`,
    ['Standard Registered User', 'user@store.com', userHash, '456 User Ave, Downtown', 'user']
  );
  db.run(
    `INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)`,
    ['Store Owner Representative', 'owner@store.com', ownerHash, '789 Business Rd, Market', 'store_owner']
  );
  db.run(
    `INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)`,
    ['Pizza Hut', 'pizza@store.com', '123 Food St', 3]
  );

  db.run(
    `INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)`,
    ['Burger King', 'burger@store.com', '456 Fast Food Ave', 3]
  );
  db.run(
    `INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)`,
    ['Domino\'s Pizza', 'dominos@store.com', '789 Pizza Rd', 3]
  );
  db.run(`INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)`, [2, 1, 5]);
  db.run(`INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)`, [2, 2, 4]);
  db.run(`INSERT INTO ratings (user_id, store_id, rating) VALUES (?, ?, ?)`, [2, 3, 5]);
  console.log('✅ Sample data inserted');
}

module.exports = db;