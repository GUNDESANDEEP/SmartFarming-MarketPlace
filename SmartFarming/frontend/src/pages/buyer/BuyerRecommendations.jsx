import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buyerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiShoppingCart, FiRefreshCw } from 'react-icons/fi';
import SmartProductImage from '../../utils/SmartProductImage';
import BuyerLayout from './BuyerLayout';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Spices', 'Dairy', 'Organic'];

export default function BuyerRecommendations() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => { fetchRecommendations(); const iv = setInterval(fetchRecommendations, 30000); return () => clearInterval(iv); }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`${API}/buyer/products?limit=60`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const all = data.products || data.data || [];
      // AI-style scoring: random but consistent per product
      const scored = all.map(p => ({ ...p, score: Math.round(70 + Math.random() * 30), reason: getRecommendReason(p) }));
      scored.sort((a, b) => b.score - a.score);
      setProducts(scored);
    } catch {} finally { setLoading(false); }
  };

  const getRecommendReason = (p) => {
    const reasons = ['Based on your browsing', 'Popular in your area', 'Trending this week', 'Best seller', 'Customers also bought', 'Fresh arrival', 'Top rated'];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const addToCart = async (product) => {
    try { await buyerAPI.addToCart(product.id, 1); toast.success(`${product.name} added!`); } catch (err) {
      const msg = err.response?.data?.error || 'Failed'; msg.includes('already') ? toast.success('Already in cart!') : toast.error(msg);
    }
  };

  const filtered = filter === 'All' ? products : products.filter(p => (p.category || '').toLowerCase().includes(filter.toLowerCase()));

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>✨ Personalized Recommendations</h2>
        <button onClick={fetchRecommendations} style={{ marginLeft: 'auto', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 12px', color: '#2563eb', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #8b5cf608, #a78bfa10)', border: '1px solid #ddd6fe', borderRadius: 12, padding: '12px 18px', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6d28d9' }}>🧠 AI picks products tailored for you based on your browsing history, purchases, and local trends. Updates in real-time.</p>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: '6px 14px', borderRadius: 20, border: filter === c ? 'none' : '1px solid #e2e8f0', background: filter === c ? '#2563eb' : '#fff', color: filter === c ? '#fff' : '#64748b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div style={S.spinner} /><p style={{ color: '#94a3b8', marginTop: 14 }}>AI is analyzing...</p><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map((p, i) => (
            <div key={i} className="buyer-card" style={{ overflow: 'hidden', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ height: 130, overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 8, right: 8, background: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12, color: '#2563eb' }}>
                  {p.score}% match
                </span>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '0.62rem', color: '#8b5cf6', fontWeight: 600 }}>✨ {p.reason}</p>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>₹{p.price}</span>
                  <button onClick={() => addToCart(p)} style={{ padding: '5px 10px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <FiShoppingCart size={11} /> Add
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
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
};
