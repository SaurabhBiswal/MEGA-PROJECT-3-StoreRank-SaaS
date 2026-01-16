const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'store_rating.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database error:', err);
        return;
    }
    console.log('✅ Connected to database for coordinate update');
});

db.serialize(() => {
    // Add columns if they missing
    db.run('ALTER TABLE stores ADD COLUMN latitude REAL', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            // if it errors for other reasons, just log
        }
    });
    db.run('ALTER TABLE stores ADD COLUMN longitude REAL', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            // if it errors for other reasons, just log
        }
    });

    const coords = {
        'Pizza Hut': [12.9716, 77.5946],
        'Burger King': [12.9345, 77.6101],
        'Domino\'s Pizza': [12.9784, 77.6408]
    };

    for (const [name, [lat, lng]] of Object.entries(coords)) {
        db.run('UPDATE stores SET latitude = ?, longitude = ? WHERE name = ?', [lat, lng, name], function (err) {
            if (err) {
                console.error(`❌ Error updating ${name}:`, err.message);
            } else {
                console.log(`✅ Updated ${name} with coordinates`);
            }
        });
    }

    db.close(() => {
        console.log('🏁 Migration & Update complete. Please refresh your browser.');
    });
});
