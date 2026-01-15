const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db'); 

process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

setInterval(() => { }, 100000);
console.log('⚡ Keep-alive interval set');

const app = express();
app.use(cors());
app.use(express.json());

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
    db.run(
      'INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, address, role],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          if (err.message.includes('CHECK constraint failed')) {
            return res.status(400).json({ error: 'Database constraint failed: Name must be 5-60 chars' });
          }
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          success: true,
          user: {
            id: this.lastID,
            name,
            email,
            role,
            address
          },
          token: `token-${this.lastID}`
        });
      }
    );

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({
        token: `token-${user.id}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          address: user.address
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
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

      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newTxHash, userId], (updateErr) => {
        if (updateErr) {
          console.error('Password update error:', updateErr);
          return res.status(500).json({ error: 'Failed to update password' });
        }
        res.json({ success: true, message: 'Password updated successfully' });
      });
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/stores', (req, res) => {
  let { sortBy, order, userId, search } = req.query;
  userId = userId || -1;
  const sortColumn = sortBy === 'rating' ? 'average_rating' : 'name';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

  let query = `
    SELECT 
      s.id, s.name, s.email, s.address, s.owner_id, s.created_at,
      COALESCE(AVG(r.rating), 0) as average_rating,
      COUNT(r.id) as total_ratings,
      (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = ?) as my_rating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
  `;

  const params = [userId];
  if (search) {
    query += ` WHERE s.name LIKE ? OR s.address LIKE ? OR s.email LIKE ? `;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ` GROUP BY s.id ORDER BY ${sortColumn} ${sortOrder} `;

  db.all(query, params, (err, stores) => {
    if (err) {
      console.error('Stores error:', err);
      return res.status(500).json({ error: 'Failed to fetch stores' });
    }

    const formattedStores = stores.map(store => ({
      ...store,
      average_rating: store.average_rating ? parseFloat(store.average_rating.toFixed(1)) : 0
    }));

    res.json(formattedStores);
  });
});

app.get('/api/users', (req, res) => {
  const { sortBy, order, search } = req.query;
  let orderBy = 'name';
  if (sortBy === 'email') orderBy = 'email';
  if (sortBy === 'role') orderBy = 'role';

  const direction = order === 'desc' ? 'DESC' : 'ASC';

  let query = `SELECT id, name, email, address, role, created_at FROM users`;
  const params = [];

  if (search) {
    query += ` WHERE name LIKE ? OR email LIKE ? OR address LIKE ? OR role LIKE ?`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY ${orderBy} ${direction}`;

  db.all(query, params, (err, users) => {
    if (err) { return res.status(500).json({ error: 'Failed to fetch users' }); }
    res.json(users);
  });
});

app.post('/api/stores', (req, res) => {
  const { name, address, email, owner_id } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address required' });
  }

  db.run(
    'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
    [name, email, address, owner_id],
    function (err) {
      if (err) {
        console.error('Add store error:', err);
        return res.status(500).json({ error: 'Failed to add store' });
      }
      res.json({ success: true, store: { id: this.lastID, name, address, owner_id } });
    }
  );
});

app.put('/api/stores/:id', (req, res) => {
  const storeId = req.params.id;
  const { name, address, email } = req.body;

  if (!name || !address || !email) {
    return res.status(400).json({ error: 'Name, address, and email are required' });
  }

  db.run(
    'UPDATE stores SET name = ?, address = ?, email = ? WHERE id = ?',
    [name, address, email, storeId],
    function (err) {
      if (err) {
        console.error('Update store error:', err);
        return res.status(500).json({ error: 'Failed to update store' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }
      res.json({ success: true, message: 'Store updated successfully' });
    }
  );
});

app.post('/api/ratings', (req, res) => {
  const { user_id, store_id, rating, comment } = req.body;

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }
  if (comment && comment.length > 500) {
    return res.status(400).json({ error: 'Comment too long (max 500 chars)' });
  }

  const query = `
    INSERT INTO ratings (user_id, store_id, rating, comment) 
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, store_id) 
    DO UPDATE SET rating = excluded.rating, comment = excluded.comment
  `;

  db.run(query, [user_id, store_id, rating, comment], function (err) {
    if (err) {
      console.error('Rating error:', err);
      return res.status(500).json({ error: 'Failed to submit rating' });
    }
    res.json({ success: true, message: 'Rating submitted successfully' });
  });
});

app.get('/api/user-ratings/:userId', (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT r.*, s.name as store_name, s.address as store_address
    FROM ratings r
    JOIN stores s ON r.store_id = s.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;

  db.all(query, [userId], (err, ratings) => {
    if (err) {
      console.error('User ratings error:', err);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }
    res.json(ratings);
  });
});

app.get('/api/users', (req, res) => {
  const { sortBy, order } = req.query;
  let orderBy = 'name';
  if (sortBy === 'email') orderBy = 'email';
  if (sortBy === 'role') orderBy = 'role';

  const direction = order === 'desc' ? 'DESC' : 'ASC';

  db.all(`SELECT id, name, email, address, role, created_at FROM users ORDER BY ${orderBy} ${direction}`, [], (err, users) => {
    if (err) { return res.status(500).json({ error: 'Failed to fetch users' }); }
    res.json(users);
  });
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, email, password, address, role = 'user' } = req.body;
    if (name.length < 5 || name.length > 60) {
      return res.status(400).json({ error: 'Name must be 5-60 characters' });
    }

    if (address && address.length > 400) {
      return res.status(400).json({ error: 'Address too long (max 400 chars)' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Invalid password format (8-16 chars, 1 Upper, 1 Special)' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, address, role],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email exists' });
          if (err.message.includes('CHECK')) return res.status(400).json({ error: 'Name must be 5-60 chars' });
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, user: { id: this.lastID, name, email, role } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/stats', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as c FROM users', (e, r) => {
    stats.total_users = r ? r.c : 0;
    db.get('SELECT COUNT(*) as c FROM stores', (e, r) => {
      stats.total_stores = r ? r.c : 0;
      db.get('SELECT COUNT(*) as c FROM ratings', (e, r) => {
        stats.total_ratings = r ? r.c : 0;
        res.json(stats);
      });
    });
  });
});

app.get('/api/store-owner/:ownerId/ratings', (req, res) => {
  const ownerId = req.params.ownerId;
  const query = `
    SELECT r.*, u.name as user_name, u.email as user_email, s.name as store_name
    FROM ratings r
    JOIN stores s ON r.store_id = s.id
    JOIN users u ON r.user_id = u.id
    WHERE s.owner_id = ?
    ORDER BY r.created_at DESC
  `;
  db.all(query, [ownerId], (err, ratings) => {
    if (err) return res.status(500).json({ error: 'Error' });
    res.json(ratings);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});