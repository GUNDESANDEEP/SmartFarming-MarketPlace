import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { farmerAPI, adminAPI } from '../../services/api';
import SellerLayout from './SellerLayout';

export default function FarmerEarnings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [platformFees, setPlatformFees] = useState({
    gstPercent: 0, platformPercent: 0, deliveryFlat: 0,
  });

  useEffect(() => {
    fetchEarnings();
    fetchPlatformFees();
    // Re-fetch fees when user navigates back to this page (same tab)
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchPlatformFees(); };
    const handleFocus = () => fetchPlatformFees();
    // Cross-tab sync
    const handleStorageChange = (e) => { if (e.key === 'sf_admin_fees') fetchPlatformFees(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await farmerAPI.getEarnings();
      setEarnings(response.data);
    } catch (error) {
      console.error('Earnings error:', error);
      setEarnings({ total: 0, thisMonth: 0, pending: 0, rating: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformFees = async () => {
    // Try backend API first, then localStorage fallback
    try {
      const res = await adminAPI.getPlatformSettings();
      const s = res.data;
      if (s && (s.gst_percent !== undefined || s.gstPercent !== undefined)) {
        setPlatformFees({
          gstPercent: s.gst_percent ?? s.gstPercent ?? 0,
          platformPercent: s.platform_percent ?? s.platformPercent ?? 0,
          deliveryFlat: s.delivery_flat ?? s.deliveryFlat ?? 0,
        });
        return;
      }
    } catch {}
    // Fallback: read from localStorage (admin saves here too)
    try {
      const stored = JSON.parse(localStorage.getItem('sf_admin_fees') || '{}');
      if (stored.gstPercent !== undefined) {
        setPlatformFees({
          gstPercent: stored.gstPercent ?? 0,
          platformPercent: stored.platformPercent ?? 0,
          deliveryFlat: stored.deliveryFlat ?? 0,
        });
      }
    } catch {}
  };

  const farmerShare = Math.max(0, 100 - platformFees.gstPercent - platformFees.platformPercent);

  const earningsCards = [
    { label: 'Total Earnings', value: `₹${(earnings?.total || 0).toLocaleString('en-IN')}`, icon: '💰', color: 'green' },
    { label: 'This Month', value: `₹${(earnings?.thisMonth || 0).toLocaleString('en-IN')}`, icon: '📅', color: 'blue' },
    { label: 'Pending', value: `₹${(earnings?.pending || 0).toLocaleString('en-IN')}`, icon: '⏳', color: 'amber' },
    { label: 'Rating', value: earnings?.rating ? `${parseFloat(earnings.rating).toFixed(1)} ⭐` : 'N/A', icon: '⭐', color: 'purple' },
  ];

  return (
    <SellerLayout title="Earnings" subtitle="Track your income & financial performance">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, animation: 'spin 1s linear infinite' }}>💰</div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading earnings...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Earnings Cards */}
          <div className="seller-stats-grid">
            {earningsCards.map((card, i) => (
              <div key={i} className="seller-stat-card">
                <div className={`seller-stat-icon ${card.color}`}>{card.icon}</div>
                <div className="seller-stat-info">
                  <p>{card.label}</p>
                  <h3>{card.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Platform Fee Structure — synced from Admin */}
          <div className="seller-card" style={{ marginTop: 20 }}>
            <div className="seller-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🏛️ Platform Fee Structure</h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Set by Admin</span>
            </div>
            <div className="seller-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: 'GST', value: `${platformFees.gstPercent}%`, icon: '🏦', color: '#166534', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#bbf7d0' },
                  { label: 'Platform Fee', value: `${platformFees.platformPercent}%`, icon: '🔧', color: '#1d4ed8', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#93c5fd' },
                  { label: 'Delivery Fee', value: `₹${platformFees.deliveryFlat}`, icon: '🚚', color: '#92400e', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fde68a' },
                  { label: 'You Receive', value: `${farmerShare.toFixed(1)}%`, icon: '💚', color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '#c4b5fd' },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '16px', background: item.bg, borderRadius: 12, border: `1px solid ${item.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.icon}</div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '14px 0 0', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
                For every ₹100 sale, you receive ₹{farmerShare.toFixed(0)} after GST ({platformFees.gstPercent}%) and Platform Fee ({platformFees.platformPercent}%) deductions.
                Delivery fee of ₹{platformFees.deliveryFlat} is charged separately to the buyer.
              </p>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="seller-card" style={{ marginTop: 20 }}>
            <div className="seller-card-header"><h3>📊 Earnings Breakdown</h3></div>
            <div className="seller-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Total Earnings (All Time)', value: `₹${(earnings?.total || 0).toLocaleString('en-IN')}`, color: '#166534' },
                  { label: 'Current Month', value: `₹${(earnings?.thisMonth || 0).toLocaleString('en-IN')}`, color: '#1d4ed8' },
                  { label: 'Pending (Undelivered)', value: `₹${(earnings?.pending || 0).toLocaleString('en-IN')}`, color: '#d97706' },
                  { label: 'Customer Rating', value: earnings?.rating ? `${parseFloat(earnings.rating).toFixed(1)}/5 ${'⭐'.repeat(Math.floor(earnings.rating || 0))}` : 'N/A', color: '#7c3aed' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.88rem' }}>{row.label}</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="seller-card" style={{ marginTop: 20, background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)' }}>
            <div className="seller-card-header"><h3>💡 Tips to Increase Earnings</h3></div>
            <div className="seller-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '📦', text: 'Add more products to your catalog' },
                  { icon: '⚡', text: 'Maintain high quality and provide timely delivery' },
                  { icon: '💰', text: 'Offer competitive prices to attract more buyers' },
                  { icon: '💬', text: 'Respond quickly to buyer inquiries' },
                  { icon: '⭐', text: 'Request feedback to improve your ratings' },
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, fontSize: '0.85rem', color: '#374151' }}>
                    <span style={{ fontSize: '1.2rem' }}>{tip.icon}</span>
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SellerLayout>
  );
}
