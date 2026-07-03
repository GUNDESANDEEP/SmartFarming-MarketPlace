import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { farmerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';

export default function FarmerMarketing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState({});
  const [profileBoosted, setProfileBoosted] = useState(false);
  const [searchBoost, setSearchBoost] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await farmerAPI.getProducts(1, 100);
      const d = res.data; setProducts(Array.isArray(d) ? d : (d.products || d.data || []));
    } catch { setProducts([]); }
  };

  const toggleFeatured = (productId) => {
    setFeaturedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
    toast.success(featuredProducts[productId] ? 'Product unfeatured' : 'Product featured! ⭐');
  };

  const promotionalBanners = [
    { id: 1, title: 'Fresh Harvest Season Sale', description: 'Get 20% off on all fresh vegetables this monsoon', status: 'active', views: 1240, clicks: 89, startDate: 'Jun 15', endDate: 'Jul 15' },
    { id: 2, title: 'Organic Products Week', description: 'Special prices on certified organic products', status: 'scheduled', views: 0, clicks: 0, startDate: 'Jul 1', endDate: 'Jul 7' },
    { id: 3, title: 'Festival Special Offer', description: 'Bulk discounts for festival season preparations', status: 'draft', views: 0, clicks: 0, startDate: 'Aug 10', endDate: 'Aug 25' },
  ];

  const marketingTips = [
    { icon: '📸', title: 'Add High-Quality Images', description: 'Products with images get 3x more views and 2x more orders', done: products.some(p => p.image_url) },
    { icon: '📝', title: 'Write Detailed Descriptions', description: 'Detailed descriptions improve search ranking and buyer confidence', done: products.some(p => p.description?.length > 50) },
    { icon: '🏷️', title: 'Set Competitive Prices', description: 'Products priced 5-10% below market average sell 40% faster', done: true },
    { icon: '🌿', title: 'Highlight Organic Products', description: 'Organic badges increase visibility and attract premium buyers', done: products.some(p => p.is_organic) },
    { icon: '📦', title: 'Maintain Stock Levels', description: 'Keep at least 50+ units in stock to avoid missed sales', done: products.some(p => (p.stockQuantity ?? p.quantity ?? 0) >= 50) },
    { icon: '⭐', title: 'Respond to Reviews', description: 'Quick responses to reviews boost your seller rating', done: false },
  ];




  return (
    <SellerLayout title="Marketing" subtitle="Promote your products & boost visibility">
      {/* Marketing Score */}
      <div className="seller-card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #052e16, #14532d)', color: '#fff' }}>
        <div className="seller-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>📢 Marketing Score</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.7 }}>Complete the tasks below to increase your visibility</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(#4ade80 ${(marketingTips.filter(t => t.done).length / marketingTips.length) * 360}deg, rgba(255,255,255,0.1) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#14532d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{Math.round((marketingTips.filter(t => t.done).length / marketingTips.length) * 100)}%</span>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.6 }}>{marketingTips.filter(t => t.done).length}/{marketingTips.length} tasks done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Featured Profile */}
        <div className="seller-card">
          <div className="seller-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: '2rem' }}>👨‍🌾</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#14532d' }}>Featured Farmer Profile</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>Appear on homepage as a featured seller</p>
              </div>
            </div>
            <button className={`seller-toggle ${profileBoosted ? 'active' : ''}`} onClick={() => { setProfileBoosted(!profileBoosted); toast.success(profileBoosted ? 'Profile unfeatured' : 'Profile featured! 🌟'); }} />
          </div>
        </div>

        {/* Search Ranking */}
        <div className="seller-card">
          <div className="seller-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: '2rem' }}>🔍</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#14532d' }}>Search Ranking Boost</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>Boost your products in search results</p>
              </div>
            </div>
            <button className={`seller-toggle ${searchBoost ? 'active' : ''}`} onClick={() => { setSearchBoost(!searchBoost); toast.success(searchBoost ? 'Boost disabled' : 'Search boost activated! 🚀'); }} />
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="seller-card" style={{ marginBottom: 20 }}>
        <div className="seller-card-header"><h3>⭐ Featured Products</h3></div>
        <div className="seller-card-body" style={{ padding: 0 }}>
          {products.length > 0 ? (
            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id || p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><span className="seller-badge seller-badge-info">{p.category || 'Others'}</span></td>
                      <td style={{ fontWeight: 600, color: '#166534' }}>₹{p.price}</td>
                      <td>{p.stockQuantity ?? p.quantity ?? 0} {p.unit || 'kg'}</td>
                      <td>
                        <button className={`seller-toggle ${featuredProducts[p.id || p._id] ? 'active' : ''}`} onClick={() => toggleFeatured(p.id || p._id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="seller-empty-state"><div className="empty-icon">📦</div><h3>No products to feature</h3><p>Add products first to feature them</p></div>
          )}
        </div>
      </div>

      {/* Promotional Banners */}
      <div className="seller-card" style={{ marginBottom: 20 }}>
        <div className="seller-card-header">
          <h3>🖼️ Promotional Banners</h3>
          <button className="seller-btn seller-btn-primary seller-btn-sm" onClick={() => toast.success('Banner editor coming soon!')}>➕ Create Banner</button>
        </div>
        <div className="seller-card-body">
          <div className="seller-promo-grid">
            {promotionalBanners.map(banner => (
              <div key={banner.id} className="seller-promo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#14532d' }}>{banner.title}</h4>
                  <span className={`seller-badge ${banner.status === 'active' ? 'seller-badge-success' : banner.status === 'scheduled' ? 'seller-badge-info' : 'seller-badge-warning'}`}>
                    {banner.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 12px' }}>{banner.description}</p>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#9ca3af' }}>
                  <span>📅 {banner.startDate} - {banner.endDate}</span>
                  <span>👁️ {banner.views} views</span>
                  <span>🖱️ {banner.clicks} clicks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Marketing Tips */}
      <div className="seller-card">
        <div className="seller-card-header"><h3>💡 Marketing Checklist</h3></div>
        <div className="seller-card-body">
          {marketingTips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: i < marketingTips.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: tip.done ? 0.6 : 1 }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{tip.icon}</span>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#14532d', textDecoration: tip.done ? 'line-through' : 'none' }}>{tip.title}</h4>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>{tip.description}</p>
              </div>
              <span style={{ fontSize: '1.2rem' }}>{tip.done ? '✅' : '⬜'}</span>
            </div>
          ))}
        </div>
      </div>
    </SellerLayout>
  );
}
