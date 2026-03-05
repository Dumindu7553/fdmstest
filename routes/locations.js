const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const locations = db.prepare(`SELECT dl.*, d.imei, d.brand, d.model, d.status, d.is_online, d.battery_level, c.full_name as customer_name FROM device_locations dl JOIN devices d ON dl.device_id = d.id LEFT JOIN customers c ON d.customer_id = c.id ORDER BY dl.recorded_at DESC`).all();
        // Deduplicate to latest per device
        const seen = new Set();
        const latest = [];
        for (const loc of locations) {
            if (!seen.has(loc.device_id)) { seen.add(loc.device_id); latest.push(loc); }
        }
        res.json(latest);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:deviceId', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { limit = 50 } = req.query;
        const locations = db.prepare('SELECT * FROM device_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?').all(req.params.deviceId, parseInt(limit));
        res.json(locations);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', (req, res) => {
    try {
        const db = getDB();
        const { device_id, latitude, longitude, accuracy } = req.body;
        if (!device_id || !latitude || !longitude) return res.status(400).json({ error: 'Missing required fields' });
        const id = uuidv4();
        db.prepare('INSERT INTO device_locations (id, device_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?, ?)').run(id, device_id, latitude, longitude, accuracy || null);
        res.status(201).json({ id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
