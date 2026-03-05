const express = require('express');
const { getDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/stats/overview', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const total = db.prepare('SELECT COUNT(*) as count FROM devices').get().count;
        const online = db.prepare('SELECT COUNT(*) as count FROM devices WHERE is_online = 1').get().count;
        const locked = db.prepare("SELECT COUNT(*) as count FROM devices WHERE status IN ('locked','payment_locked')").get().count;
        const compromised = db.prepare("SELECT COUNT(*) as count FROM devices WHERE status = 'compromised'").get().count;
        const activeAlerts = db.prepare('SELECT COUNT(*) as count FROM security_alerts WHERE is_resolved = 0').get().count;
        res.json({ total, online, offline: total - online, locked, compromised, active_alerts: activeAlerts });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { status, search, customer_id } = req.query;
        let query = 'SELECT d.*, c.full_name as customer_name FROM devices d LEFT JOIN customers c ON d.customer_id = c.id WHERE 1=1';
        const params = [];
        if (status) { query += ' AND d.status = ?'; params.push(status); }
        if (customer_id) { query += ' AND d.customer_id = ?'; params.push(customer_id); }
        if (search) { query += ' AND (d.imei LIKE ? OR d.model LIKE ? OR d.brand LIKE ? OR c.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY d.created_at DESC';
        const devices = db.prepare(query).all(...params);
        for (const d of devices) {
            d.active_alerts = db.prepare('SELECT COUNT(*) as count FROM security_alerts WHERE device_id = ? AND is_resolved = 0').get(d.id).count;
        }
        res.json(devices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const device = db.prepare('SELECT d.*, c.full_name as customer_name, c.phone as customer_phone FROM devices d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.id = ?').get(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });
        device.alerts = db.prepare('SELECT * FROM security_alerts WHERE device_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
        device.latest_location = db.prepare('SELECT * FROM device_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1').get(req.params.id) || null;
        device.recent_commands = db.prepare('SELECT * FROM commands WHERE device_id = ? ORDER BY issued_at DESC LIMIT 20').all(req.params.id);
        res.json(device);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { imei, serial_number, hardware_id, brand, model, os_version, customer_id } = req.body;
        if (!imei) return res.status(400).json({ error: 'IMEI is required' });
        const id = uuidv4();
        const fingerprint = 'FP-' + Buffer.from(`${imei}-${serial_number || ''}-${hardware_id || ''}`).toString('base64').slice(0, 16);
        db.prepare('INSERT INTO devices (id, imei, serial_number, hardware_id, hardware_fingerprint, brand, model, os_version, customer_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, imei, serial_number || null, hardware_id || null, fingerprint, brand || null, model || null, os_version || null, customer_id || null, customer_id ? 'enrolled' : 'registered');
        const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
        res.status(201).json(device);
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'IMEI already registered' });
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const allowed = ['imei', 'serial_number', 'hardware_id', 'brand', 'model', 'os_version', 'customer_id', 'status', 'sim_iccid', 'sim_operator'];
        const sets = [];
        const params = [];
        for (const [key, val] of Object.entries(req.body)) {
            if (allowed.includes(key)) { sets.push(`${key} = ?`); params.push(val); }
        }
        if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });
        sets.push('updated_at = datetime("now")');
        params.push(req.params.id);
        db.prepare(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
        res.json(device);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/assign', authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const { customer_id } = req.body;
        if (!customer_id) return res.status(400).json({ error: 'Customer ID required' });
        db.prepare('UPDATE devices SET customer_id = ?, status = "enrolled", enrolled_at = datetime("now"), updated_at = datetime("now") WHERE id = ?').run(customer_id, req.params.id);
        const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
        res.json(device);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/heartbeat', (req, res) => {
    try {
        const db = getDB();
        const { battery_level, latitude, longitude, sim_iccid, sim_operator, is_rooted, bootloader_unlocked, hardware_fingerprint } = req.body;
        db.prepare('UPDATE devices SET is_online = 1, last_heartbeat = datetime("now"), battery_level = COALESCE(?, battery_level), sim_iccid = COALESCE(?, sim_iccid), sim_operator = COALESCE(?, sim_operator), is_rooted = COALESCE(?, is_rooted), bootloader_unlocked = COALESCE(?, bootloader_unlocked), updated_at = datetime("now") WHERE id = ?')
            .run(battery_level, sim_iccid, sim_operator, is_rooted ? 1 : 0, bootloader_unlocked ? 1 : 0, req.params.id);
        if (latitude && longitude) {
            db.prepare('INSERT INTO device_locations (id, device_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.params.id, latitude, longitude, req.body.accuracy || null);
        }
        const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
        if (device && hardware_fingerprint && device.hardware_fingerprint && device.hardware_fingerprint !== hardware_fingerprint) {
            db.prepare('INSERT INTO security_alerts (id, device_id, alert_type, severity, message) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.params.id, 'hardware_mismatch', 'critical', 'Hardware fingerprint mismatch - possible device cloning');
            db.prepare('UPDATE devices SET status = "compromised" WHERE id = ?').run(req.params.id);
        }
        if (is_rooted) {
            const existing = db.prepare("SELECT id FROM security_alerts WHERE device_id = ? AND alert_type = 'root_detected' AND is_resolved = 0").get(req.params.id);
            if (!existing) {
                db.prepare('INSERT INTO security_alerts (id, device_id, alert_type, severity, message) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.params.id, 'root_detected', 'critical', 'Root access detected');
                db.prepare('UPDATE devices SET status = "compromised" WHERE id = ?').run(req.params.id);
            }
        }
        const pendingCommands = db.prepare("SELECT * FROM commands WHERE device_id = ? AND status = 'pending' ORDER BY issued_at").all(req.params.id);
        let paymentLock = false;
        const plan = db.prepare("SELECT pp.* FROM payment_plans pp WHERE pp.device_id = ? AND pp.status = 'active'").get(req.params.id);
        if (plan) {
            const overdue = db.prepare("SELECT COUNT(*) as count FROM payments WHERE plan_id = ? AND status = 'overdue'").get(plan.id);
            if (overdue.count > 0) paymentLock = true;
        }
        res.json({ commands: pendingCommands, payment_lock: paymentLock, device_status: device?.status });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
