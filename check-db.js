const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'store_rating.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error(err);
});

db.all("SELECT id, name, latitude, longitude FROM stores", [], (err, rows) => {
    if (err) {
        console.error('❌ SQL Error:', err.message);
    } else {
        console.log('📊 Current Store Data in DB:');
        console.table(rows);
    }
    db.close();
});
