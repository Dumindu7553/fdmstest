import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const TYPE_ICONS = { root_detected: '☠️', bootloader_unlocked: '🔓', sim_changed: '📶', imei_mismatch: '❌', hardware_mismatch: '💀', device_cloning: '👥', tamper_detected: '🚨' };

export default function SecurityAlerts() {
    const nav = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('unresolved');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const params = filter === 'all' ? {} : filter === 'unresolved' ? { resolved: 'false' } : { resolved: 'true' };
            const [ar, sr] = await Promise.all([api.get('/alerts', { params }), api.get('/alerts/stats')]);
            setAlerts(ar.data || []);
            setStats(sr.data);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { load(); }, [filter]);

    const resolve = async (id) => {
        await api.put(`/alerts/${id}/resolve`);
        load();
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div><h1 className="page-title">Security Alerts</h1><p className="page-subtitle">Device security events and threat detection</p></div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--red-dim)' }}>🚨</div><div className="stat-value" style={{ color: 'var(--red)' }}>{stats.unresolved}</div><div className="stat-label">Active Alerts</div><div className="stat-glow" style={{ background: 'var(--red)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--amber-dim)' }}>⚠️</div><div className="stat-value" style={{ color: 'var(--amber)' }}>{stats.critical}</div><div className="stat-label">Critical</div><div className="stat-glow" style={{ background: 'var(--amber)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--teal-dim)' }}>✅</div><div className="stat-value" style={{ color: 'var(--teal)' }}>{(stats.total || 0) - (stats.unresolved || 0)}</div><div className="stat-label">Resolved</div><div className="stat-glow" style={{ background: 'var(--teal)' }} /></div>
                    <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--blue-dim)' }}>📊</div><div className="stat-value" style={{ color: 'var(--blue)' }}>{stats.total}</div><div className="stat-label">Total Alerts</div><div className="stat-glow" style={{ background: 'var(--blue)' }} /></div>
                </div>
            )}

            {/* Alert type breakdown */}
            {stats?.by_type?.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-title" style={{ marginBottom: 12 }}>Alert Breakdown</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {stats.by_type.map(t => (
                            <div key={t.alert_type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--red-dim)', borderRadius: 8, border: '1px solid rgba(255,71,87,0.2)' }}>
                                <span>{TYPE_ICONS[t.alert_type] || '⚠️'}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.alert_type?.replace(/_/g, ' ')}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{t.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Alert Feed</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['unresolved', 'all', 'resolved'].map(f => (
                            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(f); setLoading(true); }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                    </div>
                </div>

                {loading ? <div className="loading-center"><div className="spinner" /></div> : alerts.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">No alerts in this category</div></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {alerts.map(a => (
                            <div key={a.id} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                                background: a.is_resolved ? 'transparent' : a.severity === 'critical' ? 'var(--red-dim)' : 'var(--amber-dim)',
                                border: `1px solid ${a.is_resolved ? 'var(--border)' : a.severity === 'critical' ? 'rgba(255,71,87,0.25)' : 'rgba(255,179,0,0.25)'}`,
                                borderRadius: 10
                            }}>
                                <div style={{ fontSize: 28, flexShrink: 0 }}>{TYPE_ICONS[a.alert_type] || '⚠️'}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{a.alert_type?.replace(/_/g, ' ').toUpperCase()}</span>
                                        <span className={`badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-amber' : 'badge-blue'}`}>{a.severity}</span>
                                        {a.is_resolved && <span className="badge badge-green">✓ Resolved</span>}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{a.message}</div>
                                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                                        <span>📱 {a.brand} {a.model}</span>
                                        <span style={{ fontFamily: 'monospace' }}>IMEI: {a.imei}</span>
                                        {a.customer_name && <span>👤 {a.customer_name}</span>}
                                        <span>🕐 {new Date(a.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                    <button className="btn btn-sm btn-secondary" onClick={() => nav(`/devices/${a.device_id}`)}>View Device</button>
                                    {!a.is_resolved && <button className="btn btn-sm btn-success" onClick={() => resolve(a.id)}>Resolve</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
