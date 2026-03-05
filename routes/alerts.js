const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { device_id, alert_type, resolved, severity } = req.query;
        let query = `SELECT sa.*, d.imei, d.brand, d.model, d.status as device_status, c.full_name as customer_name FROM security_alerts sa JOIN devices d ON sa.device_id = d.id LEFT JOIN customers c ON d.customer_id = c.id WHERE 1=1`;
        const params = [];
        if (device_id) { query += ' AND sa.device_id = ?'; params.push(device_id); }
        if (alert_type) { query += ' AND sa.alert_type = ?'; params.push(alert_type); }
        if (resolved !== undefined) { query += ' AND sa.is_resolved = ?'; params.push(resolved === 'true' ? 1 : 0); }
        if (severity) { query += ' AND sa.severity = ?'; params.push(severity); }
        query += ' ORDER BY sa.created_at DESC LIMIT 100';
        res.json(db.prepare(query).all(...params));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', (req, res) => {
    try {
        const db = getDB();
        const { device_id, alert_type, severity, message } = req.body;
        if (!device_id || !alert_type) return res.status(400).json({ error: 'Device ID and type required' });
        const id = uuidv4();
        db.prepare('INSERT INTO security_alerts (id, device_id, alert_type, severity, message) VALUES (?, ?, ?, ?, ?)').run(id, device_id, alert_type, severity || 'high', message || alert_type + ' detected');
        if (['root_detected', 'bootloader_unlocked', 'imei_mismatch', 'hardware_mismatch', 'device_cloning'].includes(alert_type)) {
            db.prepare('UPDATE devices SET status = "compromised" WHERE id = ?').run(device_id);
            db.prepare('INSERT INTO commands (id, device_id, type, payload) VALUES (?, ?, ?, ?)').run(uuidv4(), device_id, 'lock', JSON.stringify({ reason: alert_type }));
        }
        if (global.wss) {
            global.wss.clients.forEach(client => {
                if (client.readyState === 1) client.send(JSON.stringify({ type: 'security_alert', alert: { id, device_id, alert_type, severity, message } }));
            });
        }
        res.status(201).json({ id, alert_type, severity });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/resolve', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        db.prepare('UPDATE security_alerts SET is_resolved = 1, resolved_by = ?, resolved_at = datetime("now") WHERE id = ?').run(req.user.id, req.params.id);
        res.json({ message: 'Alert resolved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const total = db.prepare('SELECT COUNT(*) as count FROM security_alerts').get().count;
        const unresolved = db.prepare('SELECT COUNT(*) as count FROM security_alerts WHERE is_resolved = 0').get().count;
        const critical = db.prepare("SELECT COUNT(*) as count FROM security_alerts WHERE severity = 'critical' AND is_resolved = 0").get().count;
        const byType = db.prepare('SELECT alert_type, COUNT(*) as count FROM security_alerts WHERE is_resolved = 0 GROUP BY alert_type').all();
        res.json({ total, unresolved, critical, by_type: byType });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
