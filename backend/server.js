const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { pool, initDB } = require('./db_pg'); // Switched to Postgres and initializes tables
const { client: redisClient, connectRedis } = require('./redisClient'); // Redis Integration
const { sendNewRatingEmail } = require('./emailService');
const { createPdfResponse } = require('./pdfService');
const { buildSchema } = require('graphql');
const { graphqlHTTP } = require('express-graphql');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper functions for Tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id || user.lastID, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' } // Short-lived
  );
};

const generateRefreshToken = async (user) => {
  const token = jwt.sign(
    { id: user.id || user.lastID, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' } // Long-lived
  );

  // Store in DB
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
    [user.id || user.lastID, token]
  );

  return token;
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Please login.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired. Please login again.' });
    req.user = user;
    next();
  });
};

// RBAC helpers
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};

const requireRoles = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('📡 Socket: New connection', socket.id);
});

// --- ROUTES ---

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, address, role = 'user' } = req.body;
    if (!name || name.length < 5 || name.length > 60) {
      return res.status(400).json({ error: 'Name must be 5-60 characters' });
    }
    if (address && address.length > 400) {
      return res.status(400).json({ error: 'Address too long (max 400 chars)' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password: 8-16 chars, 1 uppercase, 1 special character'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Postgres: Use $1, $2.. and 'RETURNING id'
    const query = 'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const values = [name, email, passwordHash, address, role];

    const dbRes = await pool.query(query, values);
    const newUserId = dbRes.rows[0].id;

    const accessToken = generateAccessToken({ id: newUserId, email, role });
    const refreshToken = await generateRefreshToken({ id: newUserId, email, role });

    res.json({
      success: true,
      user: {
        id: newUserId,
        name,
        email,
        role,
        address
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    if (error.code === '23505') { // Postgres: Unique violation code
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Note: Column is 'password' in Postgres schema, not 'password_hash'
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// REFRESH TOKEN
app.post('/api/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ error: 'Refresh Token required' });

  try {
    // 1. Check if token exists in DB
    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (rows.length === 0) return res.status(403).json({ error: 'Invalid Refresh Token' });

    // 2. Verify JWT
    jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Expired/Invalid Refresh Token' });

      // 3. Generate New Access Token
      const accessToken = generateAccessToken(user);
      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGOUT (Revoke Refresh Token)
app.post('/api/logout', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// UPDATE PASSWORD
app.post('/api/auth/update-password', authenticateToken, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'New Password: 8-16 chars, 1 uppercase, 1 special character'
      });
    }

    const newTxHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newTxHash, userId]);

    res.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET STORES (with Redis Caching)
app.get('/api/stores', authenticateToken, async (req, res) => {
  try {
    let { sortBy, order, userId, search } = req.query;
    userId = userId || -1;
    const sortColumn = sortBy === 'rating' ? 'average_rating' : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Redis Cache Key based on query params
    const cacheKey = `stores:u${userId}:s${search || 'all'}:b${sortBy}:o${order}`;

    // 1. Try to fetch from Redis
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`⚡ Redis Hit: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }
    } catch (redisErr) {
      console.error('Redis GET error:', redisErr);
    }

    console.log(`🐢 Database Miss: ${cacheKey}`);

    // 2. Base Query
    let query = `
      SELECT 
        s.id, s.name, s.email, s.address, s.latitude, s.longitude, s.owner_id,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_ratings,
        (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = $1) as my_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
    `;

    const params = [userId];
    let paramCounter = 2; // Start from $2 since $1 is userId

    if (search) {
      query += ` WHERE s.name ILIKE $${paramCounter} OR s.address ILIKE $${paramCounter + 1} OR s.email ILIKE $${paramCounter + 2} `;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramCounter += 3;
    }

    query += ` GROUP BY s.id ORDER BY ${sortColumn} ${sortOrder} `;

    const { rows } = await pool.query(query, params);

    const formattedStores = rows.map(store => ({
      ...store,
      average_rating: store.average_rating ? parseFloat(parseFloat(store.average_rating).toFixed(1)) : 0
    }));

    // 3. Save to Redis (TTL 60 seconds)
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(formattedStores));
    } catch (redisErr) {
      console.error('Redis SET error:', redisErr);
    }

    res.json(formattedStores);
  } catch (err) {
    console.error('Stores error:', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// GET USERS (Admin)
app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { sortBy, order, search } = req.query;
    let orderBy = 'name';
    if (sortBy === 'email') orderBy = 'email';
    if (sortBy === 'role') orderBy = 'role';

    const direction = order === 'desc' ? 'DESC' : 'ASC';

    let query = `SELECT id, name, email, address, role FROM users`; // Removed created_at as it wasn't migrated reliably
    const params = [];
    let paramCounter = 1;

    if (search) {
      query += ` WHERE name LIKE $${paramCounter} OR email LIKE $${paramCounter + 1} OR address LIKE $${paramCounter + 2} OR role LIKE $${paramCounter + 3}`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY ${orderBy} ${direction}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ADD STORE
app.post('/api/stores', authenticateToken, async (req, res) => {
  try {
    const { name, address, email, owner_id } = req.body;
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);

    console.log(`🚀 Adding Store: ${name}, Lat: ${latitude}, Lng: ${longitude}`);

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address required' });
    }

    const query = `
      INSERT INTO stores (name, email, address, owner_id, latitude, longitude) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [name, email, address, owner_id, isNaN(latitude) ? null : latitude, isNaN(longitude) ? null : longitude];

    const dbRes = await pool.query(query, values);
    const newStoreId = dbRes.rows[0].id;

    // Invalidate Cache
    const keys = await redisClient.keys('stores:*');
    if (keys.length > 0) await redisClient.del(keys);

    res.json({ success: true, store: { id: newStoreId, name, address, owner_id, latitude, longitude } });
  } catch (err) {
    console.error('Add store error:', err);
    res.status(500).json({ error: 'Failed to add store' });
  }
});

// UPDATE STORE
app.put('/api/stores/:id', authenticateToken, async (req, res) => {
  try {
    const storeId = req.params.id;
    const { name, address, email } = req.body;
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);

    console.log(`🚀 Updating Store ${storeId}: ${name}, Lat: ${latitude}, Lng: ${longitude}`);

    if (!name || !address || !email) {
      return res.status(400).json({ error: 'Name, address, and email are required' });
    }

    const query = `
      UPDATE stores 
      SET name = $1, address = $2, email = $3, latitude = $4, longitude = $5 
      WHERE id = $6
    `;

    const values = [name, address, email, isNaN(latitude) ? null : latitude, isNaN(longitude) ? null : longitude, storeId];

    const dbRes = await pool.query(query, values);

    if (dbRes.rowCount === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Invalidate Cache
    const keys = await redisClient.keys('stores:*');
    if (keys.length > 0) await redisClient.del(keys);

    res.json({ success: true, message: 'Store updated successfully' });
  } catch (err) {
    console.error('Update store error:', err);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// ADD RATING
app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { user_id, store_id, rating, comment } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    if (comment && comment.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 chars)' });
    }

    // Postgres UPSERT syntax
    const query = `
      INSERT INTO ratings (user_id, store_id, rating, comment, timestamp) 
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT(id) 
      DO UPDATE SET rating = excluded.rating, comment = excluded.comment
    `;
    // Note: The previous SQLite schema had UNIQUE(user_id, store_id), 
    // but db_pg.js didn't strictly enforce UNIQUE(user_id, store_id) - it only has Primary Key on ID.
    // However, for rating logic to work as "Upsert", we normally need a unique constraint.
    // Given db_pg.js schema, let's just do INSERT for now. If user rates again, it adds a new row unless we constrain it.
    // To match SQLite behavior (one rating per user per store), we should verify if a rating exists first.

    // Better Approach: Check if exists
    const checkQuery = 'SELECT id FROM ratings WHERE user_id = $1 AND store_id = $2';
    const checkRes = await pool.query(checkQuery, [user_id, store_id]);

    if (checkRes.rows.length > 0) {
      // Update
      const updateQuery = 'UPDATE ratings SET rating = $1, comment = $2, timestamp = NOW() WHERE user_id = $3 AND store_id = $4';
      await pool.query(updateQuery, [rating, comment, user_id, store_id]);
    } else {
      // Insert
      const insertQuery = 'INSERT INTO ratings (user_id, store_id, rating, comment, timestamp) VALUES ($1, $2, $3, $4, NOW())';
      await pool.query(insertQuery, [user_id, store_id, rating, comment]);
    }

    // Emit real-time event
    io.emit('new_rating', { store_id, rating, user_id });

    // Invalidate Cache (Ratings change average ratings)
    const keys = await redisClient.keys('stores:*');
    if (keys.length > 0) await redisClient.del(keys);

    // Fire-and-forget email notification to store email (and potentially owner)
    try {
      const storeQuery = `
        SELECT s.name, s.email, u.email as owner_email, u.name as owner_name, u.id as owner_id
        FROM stores s
        LEFT JOIN users u ON s.owner_id = u.id
        WHERE s.id = $1
      `;
      const storeRes = await pool.query(storeQuery, [store_id]);
      const store = storeRes.rows[0];

      if (store && (store.email || store.owner_email)) {
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [user_id]);
        const raterName = userRes.rows[0]?.name || null;

        await sendNewRatingEmail({
          to: store.owner_email || store.email,
          storeName: store.name,
          rating,
          comment,
          userName: raterName,
        });
      }
    } catch (emailErr) {
      console.error('Notification email error:', emailErr.message);
    }

    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// USER RATINGS
app.get('/api/user-ratings/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = `
      SELECT r.*, s.name as store_name, s.address as store_address
      FROM ratings r
      JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = $1
      ORDER BY r.timestamp DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('User ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// ADMIN ADD USER
app.post('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, address, role = 'user' } = req.body;
    if (name.length < 5 || name.length > 60) return res.status(400).json({ error: 'Name 5-60 chars' });

    const passwordHash = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    try {
      const dbRes = await pool.query(query, [name, email, passwordHash, address, role]);
      res.json({ success: true, user: { id: dbRes.rows[0].id, name, email, role } });
    } catch (dbErr) {
      if (dbErr.code === '23505') return res.status(400).json({ error: 'Email exists' });
      throw dbErr;
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// OWNER RATINGS
app.get('/api/store-owner/:ownerId/ratings', authenticateToken, async (req, res) => {
  try {
    const ownerId = parseInt(req.params.ownerId, 10);

    // Only the owner themselves or an admin can view these ratings
    if (req.user.role !== 'admin' && req.user.id !== ownerId) {
      return res.status(403).json({ error: 'Forbidden: cannot access other owner ratings' });
    }
    const query = `
      SELECT r.*, u.name as user_name, u.email as user_email, s.name as store_name
      FROM ratings r
      JOIN stores s ON r.store_id = s.id
      JOIN users u ON r.user_id = u.id
      WHERE s.owner_id = $1
      ORDER BY r.timestamp DESC
    `;
    const { rows } = await pool.query(query, [ownerId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// STATS
app.get('/api/stats', authenticateToken, requireRoles(['admin', 'store_owner']), async (req, res) => {
  try {
    const usersRes = await pool.query('SELECT COUNT(*) as c FROM users');
    const storesRes = await pool.query('SELECT COUNT(*) as c FROM stores');
    const ratingsRes = await pool.query('SELECT COUNT(*) as c FROM ratings');

    const stats = {
      total_users: parseInt(usersRes.rows[0].c),
      total_stores: parseInt(storesRes.rows[0].c),
      total_ratings: parseInt(ratingsRes.rows[0].c)
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Stats error' });
  }
});

// --- PDF Reports ---

// Owner-specific ratings PDF
app.get('/api/store-owner/:ownerId/ratings-pdf', authenticateToken, async (req, res) => {
  try {
    const ownerId = parseInt(req.params.ownerId, 10);

    if (req.user.role !== 'admin' && req.user.id !== ownerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const ratingsQuery = `
      SELECT r.rating, r.comment, r.timestamp, u.name as user_name, s.name as store_name
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      JOIN stores s ON r.store_id = s.id
      WHERE s.owner_id = $1
      ORDER BY r.timestamp DESC
    `;
    const { rows } = await pool.query(ratingsQuery, [ownerId]);

    createPdfResponse(res, 'store_ratings.pdf', (doc) => {
      doc.fontSize(18).text('Store Ratings Report', { align: 'center' });
      doc.moveDown();

      rows.forEach((r) => {
        doc.fontSize(12).text(`Store: ${r.store_name}`);
        doc.text(`Customer: ${r.user_name}`);
        doc.text(`Rating: ${r.rating}/5`);
        if (r.comment) doc.text(`Comment: ${r.comment}`);
        if (r.timestamp) doc.text(`Date: ${new Date(r.timestamp).toLocaleString()}`);
        doc.moveDown();
      });

      if (!rows.length) {
        doc.fontSize(12).text('No ratings found for this owner yet.', { align: 'center' });
      }
    });
  } catch (err) {
    console.error('Owner ratings PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// --- GraphQL API (Read-only, authenticated) ---

const schema = buildSchema(`
  type Stats {
    total_users: Int!
    total_stores: Int!
    total_ratings: Int!
  }

  type Store {
    id: ID!
    name: String!
    email: String
    address: String!
    average_rating: Float!
    total_ratings: Int!
  }

  type Query {
    stats: Stats!
    stores(search: String, sortBy: String, order: String): [Store!]!
  }
`);

const rootValue = {
  stats: async () => {
    const usersRes = await pool.query('SELECT COUNT(*) as c FROM users');
    const storesRes = await pool.query('SELECT COUNT(*) as c FROM stores');
    const ratingsRes = await pool.query('SELECT COUNT(*) as c FROM ratings');

    return {
      total_users: parseInt(usersRes.rows[0].c, 10),
      total_stores: parseInt(storesRes.rows[0].c, 10),
      total_ratings: parseInt(ratingsRes.rows[0].c, 10),
    };
  },
  stores: async ({ search, sortBy, order }) => {
    let query = `
      SELECT 
        s.id, s.name, s.email, s.address,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_ratings
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
    `;

    const params = [];
    let paramCounter = 1;

    if (search) {
      query += ` WHERE s.name ILIKE $${paramCounter} OR s.address ILIKE $${paramCounter + 1} `;
      const term = `%${search}%`;
      params.push(term, term);
      paramCounter += 2;
    }

    const sortColumn = sortBy === 'rating' ? 'average_rating' : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    query += ` GROUP BY s.id ORDER BY ${sortColumn} ${sortOrder} `;

    const { rows } = await pool.query(query, params);

    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      address: s.address,
      average_rating: s.average_rating ? parseFloat(parseFloat(s.average_rating).toFixed(1)) : 0,
      total_ratings: parseInt(s.total_ratings, 10),
    }));
  },
};

app.use(
  '/api/graphql',
  authenticateToken,
  graphqlHTTP({
    schema,
    rootValue,
    graphiql: process.env.NODE_ENV !== 'production',
  })
);

const PORT = process.env.PORT || 5000;

// Ensure Postgres tables exist and Redis is connected before accepting traffic
const startServer = async () => {
  try {
    await initDB();
    await connectRedis();
    server.listen(PORT, () => {
      console.log(`✅ Backend running on http://localhost:${PORT} (PostgreSQL + Redis Connected)`);
    });
  } catch (err) {
    console.error('❌ Failed to start backend:', err);
    process.exit(1);
  }
};

startServer();