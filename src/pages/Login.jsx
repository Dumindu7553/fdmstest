import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
    const nav = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const res = await api.post('/auth/login', form);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            if (res.data.user.role === 'agent') nav('/agent');
            else nav('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">F</div>
                    <h1 className="login-title">FDMS Platform</h1>
                    <p className="login-subtitle">Finance Device Management System</p>
                </div>
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-critical" style={{ marginBottom: 16 }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-control" placeholder="Enter username"
                            value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-control" type="password" placeholder="Enter password"
                            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '🔐 Sign In'}
                    </button>
                </form>
                <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-surface)', borderRadius: 8, fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: 4 }}><strong style={{ color: 'var(--teal)' }}>Admin:</strong> admin / Admin@MDM2024</div>
                    <div><strong style={{ color: 'var(--blue)' }}>Agent:</strong> agent1 / Agent@2024</div>
                </div>
            </div>
        </div>
    );
}
