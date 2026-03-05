import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function statusBadge(s) {
    const map = { active: 'badge-green', enrolled: 'badge-teal', registered: 'badge-blue', locked: 'badge-red', payment_locked: 'badge-amber', compromised: 'badge-red', suspended: 'badge-gray' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}><span className="badge-dot" />{s?.replace('_', ' ')}</span>;
}

export default function Devices() {
    const nav = useNavigate();
    const [devices, setDevices] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({ imei: '', serial_number: '', hardware_id: '', brand: '', model: '', os_version: '', customer_id: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/devices', { params: search ? { search } : {} });
            setDevices(r.data || []);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => {
        load();
        api.get('/customers').then(r => setCustomers(r.data.customers || [])).catch(() => { });
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/devices', form);
            setShowModal(false);
            setForm({ imei: '', serial_number: '', hardware_id: '', brand: '', model: '', os_version: '', customer_id: '' });
            load();
        } catch (err) { alert(err.response?.data?.error || 'Failed'); }
        setSaving(false);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Devices</h1>
                    <p className="page-subtitle">{devices.length} registered devices</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Register Device</button>
            </div>

            <div className="card">
                <form onSubmit={e => { e.preventDefault(); setLoading(true); load(); }} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div className="search-bar" style={{ flex: 1 }}>
                        <span className="search-icon">🔍</span>
                        <input placeholder="Search IMEI, model, brand, customer..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-secondary" type="submit">Search</button>
                </form>

                {loading ? <div className="loading-center"><div className="spinner" /></div> : (
                    devices.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">📱</div><div className="empty-state-text">No devices found</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Device</th><th>IMEI</th><th>Customer</th><th>Status</th><th>Online</th><th>Battery</th><th>Alerts</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {devices.map(d => (
                                        <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/devices/${d.id}`)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ fontSize: 28 }}>📱</div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{d.brand} {d.model}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.os_version}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.imei}</td>
                                            <td>{d.customer_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                                            <td>{statusBadge(d.status)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.is_online ? 'var(--green)' : 'var(--text-muted)', boxShadow: d.is_online ? '0 0 6px var(--green)' : 'none' }} />
                                                    <span style={{ fontSize: 12, color: d.is_online ? 'var(--green)' : 'var(--text-muted)' }}>{d.is_online ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {d.battery_level != null ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div className="progress-bar" style={{ width: 60 }}>
                                                            <div className="progress-fill" style={{ width: `${d.battery_level}%`, background: d.battery_level > 50 ? 'var(--green)' : d.battery_level > 20 ? 'var(--amber)' : 'var(--red)' }} />
                                                        </div>
                                                        <span style={{ fontSize: 11 }}>{d.battery_level}%</span>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td>{d.active_alerts > 0 ? <span className="badge badge-red">{d.active_alerts} 🚨</span> : <span className="badge badge-green">✓ Clear</span>}</td>
                                            <td><button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); nav(`/devices/${d.id}`); }}>View →</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Register New Device</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="form-group">
                                <label className="form-label">IMEI *</label>
                                <input className="form-control" required value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} placeholder="15-digit IMEI" maxLength={15} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Serial Number</label>
                                    <input className="form-control" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hardware ID</label>
                                    <input className="form-control" value={form.hardware_id} onChange={e => setForm({ ...form, hardware_id: e.target.value })} placeholder="Android ID" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Brand</label>
                                    <input className="form-control" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Samsung" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input className="form-control" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Galaxy A14" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">OS Version</label>
                                    <input className="form-control" value={form.os_version} onChange={e => setForm({ ...form, os_version: e.target.value })} placeholder="Android 13" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign to Customer</label>
                                    <select className="form-control" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                                        <option value="">— Select Customer —</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Register Device'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
