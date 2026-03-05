const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { device_id, status } = req.query;
        let query = 'SELECT c.*, d.imei, d.model, d.brand FROM commands c JOIN devices d ON c.device_id = d.id WHERE 1=1';
        const params = [];
        if (device_id) { query += ' AND c.device_id = ?'; params.push(device_id); }
        if (status) { query += ' AND c.status = ?'; params.push(status); }
        query += ' ORDER BY c.issued_at DESC LIMIT 100';
        res.json(db.prepare(query).all(...params));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { device_id, type, payload } = req.body;
        if (!device_id || !type) return res.status(400).json({ error: 'Device ID and type required' });
        const id = uuidv4();
        db.prepare('INSERT INTO commands (id, device_id, type, payload, issued_by) VALUES (?, ?, ?, ?, ?)').run(id, device_id, type, payload ? JSON.stringify(payload) : null, req.user.id);
        if (type === 'lock') db.prepare('UPDATE devices SET status = "locked" WHERE id = ?').run(device_id);
        else if (type === 'unlock') db.prepare('UPDATE devices SET status = "active" WHERE id = ?').run(device_id);
        else if (type === 'payment_lock') db.prepare('UPDATE devices SET status = "payment_locked" WHERE id = ?').run(device_id);
        if (global.wss) {
            global.wss.clients.forEach(client => {
                if (client.readyState === 1) client.send(JSON.stringify({ type: 'command_issued', command: { id, device_id, type, payload } }));
            });
        }
        res.status(201).json({ id, device_id, type, status: 'pending' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/acknowledge', (req, res) => {
    try {
        const db = getDB();
        db.prepare('UPDATE commands SET status = "acknowledged", acknowledged_at = datetime("now") WHERE id = ?').run(req.params.id);
        res.json({ message: 'Acknowledged' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/lock/:deviceId', authenticateToken, (req, res) => {
    const db = getDB();
    const id = uuidv4();
    const { message } = req.body;
    db.prepare('INSERT INTO commands (id, device_id, type, payload, issued_by) VALUES (?, ?, ?, ?, ?)').run(id, req.params.deviceId, 'lock', message ? JSON.stringify({ message }) : null, req.user.id);
    db.prepare('UPDATE devices SET status = "locked" WHERE id = ?').run(req.params.deviceId);
    res.status(201).json({ id, type: 'lock', status: 'pending' });
});

router.post('/unlock/:deviceId', authenticateToken, (req, res) => {
    const db = getDB();
    const id = uuidv4();
    db.prepare('INSERT INTO commands (id, device_id, type, issued_by) VALUES (?, ?, ?, ?)').run(id, req.params.deviceId, 'unlock', req.user.id);
    db.prepare('UPDATE devices SET status = "active" WHERE id = ?').run(req.params.deviceId);
    res.status(201).json({ id, type: 'unlock', status: 'pending' });
});

router.post('/message/:deviceId', authenticateToken, (req, res) => {
    const db = getDB();
    const id = uuidv4();
    const { title, body } = req.body;
    db.prepare('INSERT INTO commands (id, device_id, type, payload, issued_by) VALUES (?, ?, ?, ?, ?)').run(id, req.params.deviceId, 'message', JSON.stringify({ title: title || 'Notice', body: body || '' }), req.user.id);
    res.status(201).json({ id, type: 'message', status: 'pending' });
});

module.exports = router;
