import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/client';

// Fix leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

function statusBadge(s) {
    const map = { active: 'badge-green', enrolled: 'badge-teal', registered: 'badge-blue', locked: 'badge-red', payment_locked: 'badge-amber', compromised: 'badge-red', suspended: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}><span className="badge-dot" />{s?.replace('_', ' ')}</span>;
}

export default function DeviceDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [device, setDevice] = useState(null);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [messageModal, setMessageModal] = useState(false);
    const [msgForm, setMsgForm] = useState({ title: '', body: '' });
    const [lockMsg, setLockMsg] = useState('');
    const [tab, setTab] = useState('overview');

    const load = async () => {
        try {
            const [dr, lr] = await Promise.all([api.get(`/devices/${id}`), api.get(`/locations/${id}`, { params: { limit: 20 } })]);
            setDevice(dr.data);
            setLocations(lr.data || []);
        } catch (e) { nav('/devices'); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    const doAction = async (action, payload = {}) => {
        setActionLoading(action);
        try {
            if (action === 'lock') await api.post(`/commands/lock/${id}`, { message: lockMsg });
            else if (action === 'unlock') await api.post(`/commands/unlock/${id}`);
            else if (action === 'payment_lock') await api.post('/commands', { device_id: id, type: 'payment_lock', payload });
            else if (action === 'locate') await api.post('/commands', { device_id: id, type: 'locate' });
            await load();
        } catch (e) { alert('Action failed'); }
        setActionLoading('');
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        setActionLoading('message');
        try {
            await api.post(`/commands/message/${id}`, msgForm);
            setMessageModal(false);
            setMsgForm({ title: '', body: '' });
        } catch (e) { alert('Failed'); }
        setActionLoading('');
    };

    const resolveAlert = async (alertId) => {
        await api.put(`/alerts/${alertId}/resolve`);
        load();
    };

    if (loading) return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
    if (!device) return null;

    const loc = device.latest_location;

    return (
        <div className="page-content">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button className="btn-icon" onClick={() => nav('/devices')}>←</button>
                    <div style={{ fontSize: 36 }}>📱</div>
                    <div>
                        <h1 className="page-title">{device.brand} {device.model}</h1>
                        <p className="page-subtitle">IMEI: {device.imei} · {device.customer_name || 'Unassigned'}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: device.is_online ? 'var(--green)' : 'var(--text-muted)', boxShadow: device.is_online ? '0 0 8px var(--green)' : 'none' }} />
                        <span style={{ fontSize: 13 }}>{device.is_online ? 'Online' : 'Offline'}</span>
                    </div>
                    {statusBadge(device.status)}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-title" style={{ marginBottom: 16 }}>Remote Control</div>
                <div className="control-grid">
                    <button className="control-btn danger" onClick={() => doAction('lock')} disabled={!!actionLoading}>
                        <span className="ctrl-icon">🔒</span>
                        {actionLoading === 'lock' ? 'Locking...' : 'Lock Device'}
                    </button>
                    <button className="control-btn success" onClick={() => doAction('unlock')} disabled={!!actionLoading}>
                        <span className="ctrl-icon">🔓</span>
                        {actionLoading === 'unlock' ? 'Unlocking...' : 'Unlock Device'}
                    </button>
                    <button className="control-btn warning" onClick={() => doAction('payment_lock')} disabled={!!actionLoading}>
                        <span className="ctrl-icon">💳</span>
                        Payment Lock
                    </button>
                    <button className="control-btn info" onClick={() => setMessageModal(true)} disabled={!!actionLoading}>
                        <span className="ctrl-icon">💬</span>
                        Send Message
                    </button>
                    <button className="control-btn info" onClick={() => doAction('locate')} disabled={!!actionLoading}>
                        <span className="ctrl-icon">📍</span>
                        Request Location
                    </button>
                </div>
            </div>

            <div className="tabs">
                {['overview', 'alerts', 'location', 'commands'].map(t => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: 14 }}>Device Info</div>
                        <div className="info-list">
                            <div className="info-row"><span className="info-key">IMEI</span><span className="info-val" style={{ fontFamily: 'monospace' }}>{device.imei}</span></div>
                            <div className="info-row"><span className="info-key">Serial</span><span className="info-val" style={{ fontFamily: 'monospace' }}>{device.serial_number || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Brand</span><span className="info-val">{device.brand}</span></div>
                            <div className="info-row"><span className="info-key">Model</span><span className="info-val">{device.model}</span></div>
                            <div className="info-row"><span className="info-key">OS</span><span className="info-val">{device.os_version}</span></div>
                            <div className="info-row"><span className="info-key">Battery</span><span className="info-val">{device.battery_level != null ? `${device.battery_level}%` : '—'}</span></div>
                            <div className="info-row"><span className="info-key">SIM Operator</span><span className="info-val">{device.sim_operator || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Enrolled</span><span className="info-val">{device.enrolled_at ? new Date(device.enrolled_at).toLocaleDateString() : '—'}</span></div>
                            <div className="info-row"><span className="info-key">Last Seen</span><span className="info-val">{device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString() : 'Never'}</span></div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: 14 }}>Security Status</div>
                        <div className="info-list">
                            <div className="info-row"><span className="info-key">Status</span>{statusBadge(device.status)}</div>
                            <div className="info-row"><span className="info-key">Root Check</span><span className={`badge ${device.is_rooted ? 'badge-red' : 'badge-green'}`}>{device.is_rooted ? '⚠ Rooted' : '✓ Clean'}</span></div>
                            <div className="info-row"><span className="info-key">Bootloader</span><span className={`badge ${device.bootloader_unlocked ? 'badge-red' : 'badge-green'}`}>{device.bootloader_unlocked ? '⚠ Unlocked' : '✓ Locked'}</span></div>
                            <div className="info-row"><span className="info-key">HW Fingerprint</span><span className="info-val" style={{ fontFamily: 'monospace', fontSize: 11 }}>{device.hardware_fingerprint || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Active Alerts</span><span className={`badge ${device.alerts?.filter(a => !a.is_resolved).length > 0 ? 'badge-red' : 'badge-green'}`}>{device.alerts?.filter(a => !a.is_resolved).length || 0} alerts</span></div>
                            <div className="info-row"><span className="info-key">Customer</span><span className="info-val">{device.customer_name || '—'}</span></div>
                            <div className="info-row"><span className="info-key">Customer Phone</span><span className="info-val">{device.customer_phone || '—'}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'alerts' && (
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 14 }}>Security Alerts</div>
                    {(device.alerts || []).length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">No security alerts</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Type</th><th>Severity</th><th>Message</th><th>Time</th><th>Status</th><th></th></tr></thead>
                                <tbody>
                                    {device.alerts.map(a => (
                                        <tr key={a.id}>
                                            <td style={{ fontWeight: 600 }}>{a.alert_type?.replace(/_/g, ' ')}</td>
                                            <td><span className={`badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-amber' : 'badge-blue'}`}>{a.severity}</span></td>
                                            <td style={{ fontSize: 12 }}>{a.message}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString()}</td>
                                            <td><span className={`badge ${a.is_resolved ? 'badge-green' : 'badge-red'}`}>{a.is_resolved ? 'Resolved' : 'Active'}</span></td>
                                            <td>{!a.is_resolved && <button className="btn btn-sm btn-success" onClick={() => resolveAlert(a.id)}>Resolve</button>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'location' && (
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 14 }}>GPS Location</div>
                    {loc ? (
                        <div>
                            <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 13 }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>Lat: </span><strong>{loc.latitude?.toFixed(6)}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Lng: </span><strong>{loc.longitude?.toFixed(6)}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Accuracy: </span><strong>{loc.accuracy ? `±${loc.accuracy.toFixed(0)}m` : '—'}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Time: </span><strong>{new Date(loc.recorded_at).toLocaleString()}</strong></div>
                            </div>
                            <div className="map-container">
                                <MapContainer center={[loc.latitude, loc.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[loc.latitude, loc.longitude]}>
                                        <Popup>{device.brand} {device.model}<br />{device.customer_name}</Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state"><div className="empty-state-icon">📍</div><div className="empty-state-text">No location data available</div></div>
                    )}
                </div>
            )}

            {tab === 'commands' && (
                <div className="card">
                    <div className="card-title" style={{ marginBottom: 14 }}>Recent Commands</div>
                    {(device.recent_commands || []).length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">No commands issued</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead><tr><th>Type</th><th>Status</th><th>Issued At</th><th>Acknowledged</th></tr></thead>
                                <tbody>
                                    {device.recent_commands.map(c => (
                                        <tr key={c.id}>
                                            <td><span className="badge badge-teal">{c.type}</span></td>
                                            <td><span className={`badge ${c.status === 'acknowledged' ? 'badge-green' : c.status === 'pending' ? 'badge-amber' : 'badge-gray'}`}>{c.status}</span></td>
                                            <td style={{ fontSize: 12 }}>{new Date(c.issued_at).toLocaleString()}</td>
                                            <td style={{ fontSize: 12 }}>{c.acknowledged_at ? new Date(c.acknowledged_at).toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Send Message Modal */}
            {messageModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMessageModal(false)}>
                    <div className="modal">
                        <div className="modal-header"><h2 className="modal-title">Send Message to Device</h2><button className="modal-close" onClick={() => setMessageModal(false)}>×</button></div>
                        <form onSubmit={sendMessage}>
                            <div className="form-group"><label className="form-label">Title</label><input className="form-control" required value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} placeholder="Notice" /></div>
                            <div className="form-group"><label className="form-label">Message Body</label><textarea className="form-control" rows="4" required value={msgForm.body} onChange={e => setMsgForm({ ...msgForm, body: e.target.value })} placeholder="Message..." /></div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setMessageModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading === 'message'}>Send Message</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
