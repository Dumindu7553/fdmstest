import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function StatCard({ icon, label, value, color, sub }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: color + '22' }}>
                {icon}
            </div>
            <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-change">{sub}</div>}
            <div className="stat-glow" style={{ background: color }} />
        </div>
    );
}

const ALERT_COLORS = { root_detected: '#ff4757', bootloader_unlocked: '#ff6b35', sim_changed: '#ffb300', imei_mismatch: '#a855f7', hardware_mismatch: '#ff4757' };

export default function Dashboard() {
    const nav = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const r = await api.get('/dashboard/stats');
            setStats(r.data);
        } catch (e) { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

    if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;

    const pieData = [
        { name: 'Online', value: stats?.devices.online || 0, color: '#00c896' },
        { name: 'Offline', value: stats?.devices.offline || 0, color: '#4a6080' },
        { name: 'Locked', value: stats?.devices.locked || 0, color: '#ffb300' },
        { name: 'Compromised', value: stats?.devices.compromised || 0, color: '#ff4757' },
    ];

    const alertChartData = (stats?.recent_alerts || []).reduce((acc, a) => {
        const ex = acc.find(x => x.type === a.alert_type);
        if (ex) ex.count++;
        else acc.push({ type: a.alert_type?.replace('_', ' '), count: 1 });
        return acc;
    }, []);

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Real-time overview of your MDM platform</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
            </div>

            {/* KPI Stats */}
            <div className="stat-grid">
                <StatCard icon="📱" label="Total Devices" value={stats?.devices.total} color="var(--teal)" sub={`${stats?.devices.online} online now`} />
                <StatCard icon="👥" label="Customers" value={stats?.customers.total} color="var(--blue)" sub={`${stats?.customers.active} active`} />
                <StatCard icon="💰" label="Revenue Collected" value={`Rs ${((stats?.payments.total_revenue || 0) / 1000).toFixed(0)}K`} color="var(--green)" />
                <StatCard icon="⚠️" label="Overdue Payments" value={stats?.payments.overdue} color="var(--amber)" />
                <StatCard icon="🔒" label="Locked Devices" value={stats?.devices.locked} color="var(--amber)" />
                <StatCard icon="🚨" label="Security Alerts" value={stats?.alerts.unresolved} color="var(--red)" />
                <StatCard icon="💀" label="Compromised" value={stats?.devices.compromised} color="var(--red)" />
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
                {/* Device Status Pie */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Device Status</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <PieChart width={160} height={160}>
                            <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                        </PieChart>
                        <div style={{ flex: 1 }}>
                            {pieData.map(d => (
                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                                    <span style={{ fontWeight: 700, color: d.color }}>{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Recent Security Alerts</div>
                        <button className="btn btn-sm btn-secondary" onClick={() => nav('/alerts')}>View All</button>
                    </div>
                    {(stats?.recent_alerts || []).length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">No active alerts</div></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {stats.recent_alerts.map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.severity === 'critical' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{a.alert_type?.replace(/_/g, ' ').toUpperCase()}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.brand} {a.model} · {a.imei}</div>
                                    </div>
                                    <span className={`badge ${a.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>{a.severity}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Commands */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">Recent Commands</div>
                </div>
                {(stats?.recent_commands || []).length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">No recent commands</div></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Type</th><th>Device</th><th>IMEI</th><th>Status</th><th>Time</th></tr></thead>
                            <tbody>
                                {stats.recent_commands.map(c => (
                                    <tr key={c.id}>
                                        <td><span className="badge badge-teal">{c.type}</span></td>
                                        <td>{c.brand} {c.model}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.imei}</td>
                                        <td><span className={`badge ${c.status === 'acknowledged' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-gray'}`}>{c.status}</span></td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.issued_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
