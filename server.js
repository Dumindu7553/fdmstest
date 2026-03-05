const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { initDB, getDB } = require('./db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ─── WebSocket ──────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });
global.wss = wss;

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    ws.on('close', () => console.log('🔌 WebSocket client disconnected'));
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'heartbeat' && data.device_id) {
                const db = getDB();
                db.prepare('UPDATE devices SET is_online = 1, last_heartbeat = datetime("now"), battery_level = COALESCE(?, battery_level) WHERE id = ?')
                    .run(data.battery_level || null, data.device_id);
            }
        } catch (e) { /* ignore */ }
    });
});

// ─── Middleware ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate limiting ──────────────────────────────────────
const rateLimit = {};
app.use('/api/auth/login', (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (!rateLimit[ip]) rateLimit[ip] = [];
    rateLimit[ip] = rateLimit[ip].filter(t => now - t < 60000);
    if (rateLimit[ip].length >= 10) return res.status(429).json({ error: 'Too many attempts' });
    rateLimit[ip].push(now);
    next();
});

// ─── Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/commands', require('./routes/commands'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/locations', require('./routes/locations'));

// Dashboard stats
app.get('/api/dashboard/stats', require('./middleware/auth').authenticateToken, (req, res) => {
    try {
        const db = getDB();
        const totalDevices = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
        const onlineDevices = db.prepare('SELECT COUNT(*) as c FROM devices WHERE is_online = 1').get().c;
        const totalCustomers = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
        const activeCustomers = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status = 'active'").get().c;
        const overduePayments = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'overdue'").get().c;
        const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE status = 'paid'").get().t;
        const unresolvedAlerts = db.prepare('SELECT COUNT(*) as c FROM security_alerts WHERE is_resolved = 0').get().c;
        const lockedDevices = db.prepare("SELECT COUNT(*) as c FROM devices WHERE status IN ('locked','payment_locked')").get().c;
        const compromisedDevices = db.prepare("SELECT COUNT(*) as c FROM devices WHERE status = 'compromised'").get().c;

        const recentAlerts = db.prepare('SELECT sa.*, d.brand, d.model, d.imei FROM security_alerts sa JOIN devices d ON sa.device_id = d.id ORDER BY sa.created_at DESC LIMIT 5').all();
        const recentCommands = db.prepare('SELECT c.*, d.brand, d.model, d.imei FROM commands c JOIN devices d ON c.device_id = d.id ORDER BY c.issued_at DESC LIMIT 5').all();

        res.json({
            devices: { total: totalDevices, online: onlineDevices, offline: totalDevices - onlineDevices, locked: lockedDevices, compromised: compromisedDevices },
            customers: { total: totalCustomers, active: activeCustomers },
            payments: { overdue: overduePayments, total_revenue: totalRevenue },
            alerts: { unresolved: unresolvedAlerts },
            recent_alerts: recentAlerts,
            recent_commands: recentCommands
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Start ──────────────────────────────────────────────
async function start() {
    await initDB();
    console.log('✅ Database initialized');

    // Periodic: mark offline
    setInterval(() => {
        try {
            const db = getDB();
            db.prepare('UPDATE devices SET is_online = 0 WHERE last_heartbeat < datetime("now", "-5 minutes") AND is_online = 1').run();
        } catch (e) { /* ignore */ }
    }, 60000);

    // Periodic: check overdue
    setInterval(() => {
        try {
            const db = getDB();
            const today = new Date().toISOString().split('T')[0];
            db.prepare("UPDATE payments SET status = 'overdue' WHERE status = 'pending' AND due_date < ?").run(today);
        } catch (e) { /* ignore */ }
    }, 300000);

    server.listen(PORT, () => {
        console.log(`\n🚀 FDMS Backend running on http://localhost:${PORT}`);
        console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
        console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
    });
}

start();
