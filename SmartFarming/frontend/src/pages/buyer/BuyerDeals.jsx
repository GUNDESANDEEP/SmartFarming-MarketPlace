import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buyerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiShoppingCart, FiClock } from 'react-icons/fi';
import SmartProductImage from '../../utils/SmartProductImage';
import BuyerLayout from './BuyerLayout';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

export default function BuyerDeals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { fetchDeals(); const iv = setInterval(fetchDeals, 20000); return () => clearInterval(iv); }, []);
  useEffect(() => { const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 3600 + Math.floor(Math.random() * 7200)), 1000); return () => clearInterval(t); }, []);

  const fetchDeals = async () => {
    try {
      const res = await fetch(`${API}/buyer/products?limit=40`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const all = data.products || data.data || [];
      const deals = all.map(p => ({
        ...p,
        discount: Math.round(10 + Math.random() * 40),
        originalPrice: Math.round(p.price * (1.2 + Math.random() * 0.5)),
        dealType: ['Flash Sale', 'Bundle Deal', 'Clearance', 'Limited Offer', 'Farmer Special'][Math.floor(Math.random() * 5)],
        dealColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#16a34a'][Math.floor(Math.random() * 5)],
        sold: Math.floor(Math.random() * 50 + 10),
        total: Math.floor(Math.random() * 30 + 50),
      }));
      deals.sort((a, b) => b.discount - a.discount);
      setProducts(deals);
      if (countdown === 0) setCountdown(3600 + Math.floor(Math.random() * 7200));
    } catch {} finally { setLoading(false); }
  };

  const addToCart = async (product) => {
    try { await buyerAPI.addToCart(product.id, 1); toast.success(`${product.name} added!`); } catch (err) {
      const msg = err.response?.data?.error || 'Failed'; msg.includes('already') ? toast.success('Already in cart!') : toast.error(msg);
    }
  };

  const formatTime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${h}h ${m}m ${sec}s`; };

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>🎁 Exclusive Deals</h2>
      </div>

      {/* Countdown Banner */}
      <div style={{ background: 'linear-gradient(135deg, #dc2626, #f59e0b)', borderRadius: 14, padding: '16px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>🔥 Flash Deals — Limited Time!</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Exclusive discounts that refresh in real-time</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace' }}><FiClock size={16} style={{ verticalAlign: 'middle' }} /> {formatTime(countdown)}</div>
          <p style={{ margin: 0, fontSize: '0.62rem', opacity: 0.8 }}>until next refresh</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div style={S.spinner} /><p style={{ color: '#94a3b8', marginTop: 14 }}>Loading deals...</p><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {products.map((p, i) => (
            <div key={i} className="buyer-card" style={{ overflow: 'hidden', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ height: 130, overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 8, left: 8, background: p.dealColor, color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 10px', borderRadius: 12 }}>{p.dealType}</span>
                <span style={{ position: 'absolute', top: 8, right: 8, background: '#fff', color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>-{p.discount}%</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>₹{p.price}</span>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through' }}>₹{p.originalPrice}</span>
                </div>
                {/* Progress bar */}
                <div style={{ background: '#f1f5f9', borderRadius: 6, height: 6, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${(p.sold / p.total) * 100}%`, height: '100%', background: p.sold / p.total > 0.7 ? '#ef4444' : '#3b82f6', borderRadius: 6, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.sold}/{p.total} sold</span>
                  <button onClick={() => addToCart(p)} style={{ padding: '6px 12px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiShoppingCart size={12} /> Grab Deal
                  </button>
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
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
};
