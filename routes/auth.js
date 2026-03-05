const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { JWT_SECRET, authenticateToken, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/login', (req, res) => {
    try {
        const db = getDB();
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authenticateToken, (req, res) => {
    const db = getDB();
    const user = db.prepare('SELECT id, username, full_name, role, phone, email FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
});

router.post('/register-agent', authenticateToken, requireAdmin, (req, res) => {
    try {
        const db = getDB();
        const { username, password, full_name, phone, email } = req.body;
        if (!username || !password || !full_name) return res.status(400).json({ error: 'Missing required fields' });
        const hash = bcrypt.hashSync(password, 10);
        const id = uuidv4();
        db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, username, hash, full_name, 'agent', phone || null, email || null);
        res.status(201).json({ id, username, full_name, role: 'agent' });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

router.get('/agents', authenticateToken, (req, res) => {
    const db = getDB();
    const agents = db.prepare('SELECT id, username, full_name, phone, email, is_active, created_at FROM users WHERE role = ?').all('agent');
    res.json(agents);
});

module.exports = router;
