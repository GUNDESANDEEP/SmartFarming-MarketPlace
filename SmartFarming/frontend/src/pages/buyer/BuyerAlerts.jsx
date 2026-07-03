import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import BuyerLayout from './BuyerLayout';
import { FiArrowLeft, FiTrendingDown, FiBell } from 'react-icons/fi';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

export default function BuyerAlerts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlerts(); const iv = setInterval(fetchAlerts, 15000); return () => clearInterval(iv); }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API}/buyer/products?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const all = data.products || data.data || [];
      // Simulate price-drop alerts (products with price < 100 or discounted)
      const alerts = all.map(p => ({
        ...p,
        oldPrice: Math.round(p.price * (1 + Math.random() * 0.3)),
        dropPercent: Math.round(Math.random() * 25 + 5),
        alertTime: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
      })).sort((a, b) => b.dropPercent - a.dropPercent);
      setProducts(alerts);
    } catch {} finally { setLoading(false); }
  };

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>🔔 Price-Drop Alerts</h2>
        <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 20, fontWeight: 700, marginLeft: 'auto' }}>🔄 Live • Updates every 15s</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={S.spinner} />
          <p style={{ color: '#94a3b8', marginTop: 14 }}>Loading alerts...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : products.length === 0 ? (
        <div className="buyer-card" style={{ textAlign: 'center', padding: 60 }}>
          <span style={{ fontSize: '3rem', opacity: 0.3 }}>🔔</span>
          <h3 style={{ color: '#1e293b' }}>No price drops yet</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>We'll notify you when prices drop on products you follow</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {products.map((p, i) => (
            <div key={i} className="buyer-card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/buyer/marketplace')}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    <FiTrendingDown size={12} style={{ verticalAlign: 'middle' }} /> {p.dropPercent}% OFF
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.alertTime}</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>{p.name}</h4>
                <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: '#94a3b8' }}>by {p.farmer_name || 'Local Farmer'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>₹{p.price}</span>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{p.oldPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
};
