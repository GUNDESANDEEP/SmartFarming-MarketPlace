import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buyerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiShoppingCart } from 'react-icons/fi';
import SmartProductImage from '../../utils/SmartProductImage';
import BuyerLayout from './BuyerLayout';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

export default function BuyerEarlyAccess() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProducts(); const iv = setInterval(fetchProducts, 20000); return () => clearInterval(iv); }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/buyer/products?limit=50&sort=newest`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      const all = data.products || data.data || [];
      // Show newest products first (early access)
      const sorted = all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setProducts(sorted);
    } catch {} finally { setLoading(false); }
  };

  const addToCart = async (product) => {
    try {
      await buyerAPI.addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add to cart';
      if (msg.includes('already')) toast.success(`${product.name} is already in your cart!`);
      else toast.error(msg);
    }
  };

  const getTimeBadge = (createdAt) => {
    if (!createdAt) return '🆕 New';
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
    if (hours < 1) return '🔥 Just Added';
    if (hours < 24) return `🆕 ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>🚀 Early Product Access</h2>
        <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 20, fontWeight: 700, marginLeft: 'auto' }}>⚡ Live • Real-time updates</span>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e40af08, #3b82f608)', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af', fontWeight: 500 }}>🚀 Get access to newly listed products before they appear on the main marketplace. Be the first to buy fresh produce!</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={S.spinner} /><p style={{ color: '#94a3b8', marginTop: 14 }}>Loading new products...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {products.map((p, i) => (
            <div key={i} className="buyer-card" style={{ overflow: 'hidden', transition: 'transform 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ height: 140, overflow: 'hidden', background: '#f1f5f9', position: 'relative' }}>
                <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', top: 8, left: 8, background: '#f59e0b', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12 }}>
                  {getTimeBadge(p.created_at)}
                </span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                <p style={{ margin: '0 0 8px', fontSize: '0.7rem', color: '#94a3b8' }}>👨‍🌾 {p.farmer_name || 'Local Farmer'}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>₹{p.price}<span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>/{p.unit || 'kg'}</span></span>
                  <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} style={{ padding: '6px 12px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiShoppingCart size={12} /> Add
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
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
};
