import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function statusBadge(s) {
    const map = { active: 'badge-green', suspended: 'badge-amber', closed: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}><span className="badge-dot" />{s}</span>;
}

export default function Customers() {
    const nav = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ full_name: '', nic_number: '', phone: '', email: '', address: '', city: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/customers', { params: search ? { search } : {} });
            setCustomers(r.data.customers || []);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setLoading(true);
        load();
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/customers', form);
            setShowModal(false);
            setForm({ full_name: '', nic_number: '', phone: '', email: '', address: '', city: '', notes: '' });
            load();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to add customer');
        }
        setSaving(false);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">{customers.length} registered customers</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Customer</button>
            </div>

            <div className="card">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div className="search-bar" style={{ flex: 1 }}>
                        <span className="search-icon">🔍</span>
                        <input placeholder="Search name, NIC, phone..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-secondary" type="submit">Search</button>
                </form>

                {loading ? <div className="loading-center"><div className="spinner" /></div> : (
                    customers.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">No customers found</div></div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>NIC</th><th>Phone</th><th>City</th><th>Status</th><th>Devices</th><th>Plans</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {customers.map(c => (
                                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/customers/${c.id}`)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000', flexShrink: 0 }}>
                                                        {c.full_name[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.agent_name ? `Agent: ${c.agent_name}` : ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.nic_number || '—'}</td>
                                            <td>{c.phone}</td>
                                            <td>{c.city || '—'}</td>
                                            <td>{statusBadge(c.status)}</td>
                                            <td><span className="badge badge-blue">{c.device_count || 0}</span></td>
                                            <td><span className="badge badge-teal">{c.active_plans || 0} active</span></td>
                                            <td><button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); nav(`/customers/${c.id}`); }}>View →</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Add Customer Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Register New Customer</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">NIC Number</label>
                                    <input className="form-control" value={form.nic_number} onChange={e => setForm({ ...form, nic_number: e.target.value })} placeholder="National ID" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone *</label>
                                    <input className="form-control" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+94771234567" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Colombo" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Customer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
