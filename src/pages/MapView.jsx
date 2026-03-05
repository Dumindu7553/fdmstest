import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

const STATUS_COLORS = { active: '#00c896', locked: '#ff4757', payment_locked: '#ffb300', compromised: '#ff4757', enrolled: '#2979ff', registered: '#8fa3c0', suspended: '#4a6080' };

export default function MapView() {
    const nav = useNavigate();
    const [locations, setLocations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/locations').then(r => setLocations(r.data || [])).catch(() => { }).finally(() => setLoading(false));
        const t = setInterval(() => { api.get('/locations').then(r => setLocations(r.data || [])).catch(() => { }); }, 30000);
        return () => clearInterval(t);
    }, []);

    const center = locations.length > 0
        ? [locations.reduce((s, l) => s + l.latitude, 0) / locations.length, locations.reduce((s, l) => s + l.longitude, 0) / locations.length]
        : [6.9271, 79.8612];

    return (
        <div className="page-content">
            <div className="page-header">
                <div><h1 className="page-title">Live Map</h1><p className="page-subtitle">{locations.length} device locations tracked</p></div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(STATUS_COLORS).map(([s, c]) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{s.replace('_', ' ')}
                        </div>
                    ))}
                </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ height: 580 }}>
                    {loading ? (
                        <div className="loading-center"><div className="spinner spinner-lg" /></div>
                    ) : (
                        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                            {locations.map(loc => (
                                <CircleMarker key={loc.id} center={[loc.latitude, loc.longitude]}
                                    radius={selected?.id === loc.id ? 14 : 10}
                                    pathOptions={{ fillColor: STATUS_COLORS[loc.status] || '#8fa3c0', fillOpacity: 0.9, color: '#fff', weight: 2 }}
                                    eventHandlers={{ click: () => setSelected(selected?.id === loc.id ? null : loc) }}>
                                    <Popup>
                                        <div style={{ fontSize: 13, minWidth: 180 }}>
                                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{loc.brand} {loc.model}</div>
                                            <div style={{ marginBottom: 3 }}>👤 {loc.customer_name || 'Unassigned'}</div>
                                            <div style={{ marginBottom: 3, fontFamily: 'monospace', fontSize: 11 }}>IMEI: {loc.imei}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <span style={{ padding: '2px 8px', borderRadius: 12, background: STATUS_COLORS[loc.status] + '33', color: STATUS_COLORS[loc.status], fontSize: 11, fontWeight: 600 }}>{loc.status}</span>
                                                <span style={{ padding: '2px 8px', borderRadius: 12, background: loc.is_online ? '#00c89633' : '#4a608033', color: loc.is_online ? '#00c896' : '#4a6080', fontSize: 11 }}>{loc.is_online ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <button onClick={() => nav(`/devices/${loc.device_id}`)} style={{ marginTop: 8, padding: '5px 12px', background: '#00e5c8', border: 'none', borderRadius: 6, color: '#000', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%' }}>View Device →</button>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    )}
                </div>
            </div>
            {/* Device sidebar list */}
            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>Device Locations</div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead><tr><th>Device</th><th>Customer</th><th>Status</th><th>Lat/Lng</th><th>Last Update</th><th></th></tr></thead>
                        <tbody>
                            {locations.map(loc => (
                                <tr key={loc.id} style={{ cursor: 'pointer', background: selected?.id === loc.id ? 'var(--teal-dim)' : '' }} onClick={() => setSelected(selected?.id === loc.id ? null : loc)}>
                                    <td><span style={{ fontWeight: 600 }}>{loc.brand} {loc.model}</span></td>
                                    <td>{loc.customer_name || '—'}</td>
                                    <td><span style={{ padding: '2px 8px', borderRadius: 12, background: (STATUS_COLORS[loc.status] || '#8fa3c0') + '22', color: STATUS_COLORS[loc.status] || '#8fa3c0', fontSize: 11, fontWeight: 600 }}>{loc.status}</span></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}</td>
                                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(loc.recorded_at).toLocaleString()}</td>
                                    <td><button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); nav(`/devices/${loc.device_id}`); }}>→</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
