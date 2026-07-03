import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkoutAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPackage, FiTruck, FiCheck, FiX, FiClock, FiChevronRight } from 'react-icons/fi';
import BuyerLayout from './BuyerLayout';

const STATUS_CONFIG = {
  PLACED:           { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🔔', label: 'Order Placed' },
  CONFIRMED:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '✅', label: 'Confirmed' },
  ACCEPTED:         { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: '👨‍🌾', label: 'Farmer Accepted' },
  PACKED:           { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', icon: '📦', label: 'Packed' },
  OUT_FOR_DELIVERY: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: '🚚', label: 'Out for Delivery' },
  DELIVERED:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '🎉', label: 'Delivered' },
  CANCELLED:        { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '❌', label: 'Cancelled' },
};

const TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await checkoutAPI.getOrders();
      setOrders(res.data?.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return !['DELIVERED','CANCELLED'].includes(o.order_status);
    if (activeTab === 'delivered') return o.order_status === 'DELIVERED';
    if (activeTab === 'cancelled') return o.order_status === 'CANCELLED';
    return true;
  });

  const getProgress = (status) => {
    const steps = ['PLACED','CONFIRMED','ACCEPTED','PACKED','OUT_FOR_DELIVERY','DELIVERED'];
    const idx = steps.indexOf(status);
    return idx >= 0 ? ((idx + 1) / steps.length) * 100 : 0;
  };

  return (
    <BuyerLayout>
      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' }}>
          <FiArrowLeft size={18} /> Back
        </Link>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>📋 My Orders</h2>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label}
            {tab.key === 'active' && orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.order_status)).length > 0 && (
              <span style={styles.tabBadge}>
                {orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.order_status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={styles.container}>
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={{color:'#94a3b8',marginTop:12}}>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={{fontSize:64}}>📦</div>
            <h3 style={{color:'#f1f5f9',margin:'16px 0 8px'}}>No orders yet</h3>
            <p style={{color:'#94a3b8',fontSize:14}}>Start shopping to see your orders here</p>
            <button onClick={() => navigate('/buyer/marketplace')} style={styles.shopBtn}>
              🛒 Browse Marketplace
            </button>
          </div>
        ) : (
          <div style={styles.orderList}>
            {filteredOrders.map(order => {
              const sc = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.PLACED;
              const progress = getProgress(order.order_status);
              const date = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : '';

              return (
                <div
                  key={order.id}
                  style={styles.orderCard}
                  onClick={() => navigate(`/buyer/orders/${order.id}`)}
                >
                  <div style={styles.orderHeader}>
                    <div>
                      <span style={styles.orderNum}>{order.order_number}</span>
                      <span style={styles.orderDate}>{date}</span>
                    </div>
                    <div style={{...styles.statusBadge, color: sc.color, background: sc.bg}}>
                      {sc.icon} {sc.label}
                    </div>
                  </div>

                  {/* Items preview */}
                  <div style={styles.itemsPreview}>
                    {(order.items || []).slice(0, 3).map((item, i) => (
                      <div key={i} style={styles.itemChip}>
                        {item.product_image ? (
                          <img src={item.product_image} alt="" style={styles.chipImg} />
                        ) : (
                          <span style={styles.chipEmoji}>🌾</span>
                        )}
                        <span>{item.product_name}</span>
                        <span style={styles.chipQty}>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {order.order_status !== 'CANCELLED' && (
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${progress}%`, background: sc.color}} />
                    </div>
                  )}

                  <div style={styles.orderFooter}>
                    <div style={styles.footerLeft}>
                      <span style={styles.totalLabel}>Total</span>
                      <span style={styles.totalValue}>₹{parseFloat(order.total_amount || 0).toFixed(0)}</span>
                      <span style={{
                        ...styles.payBadge,
                        color: order.payment_method === 'cod' ? '#f59e0b' : '#22c55e',
                        background: order.payment_method === 'cod' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      }}>
                        {order.payment_method === 'cod' ? '💵 COD' : '💳 Paid'}
                      </span>
                    </div>
                    <FiChevronRight size={20} color="#475569" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </BuyerLayout>
  );
}

const styles = {
  page: { fontFamily: "'Inter', sans-serif", color: '#1e293b' },

  tabBar: { display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' },
  tab: { padding: '8px 16px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.2s' },
  tabActive: { background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' },
  tabBadge: { background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' },

  container: { maxWidth: 800, margin: '0 auto' },
  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: { width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
  emptyBox: { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  shopBtn: { marginTop: 16, padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },

  orderList: { display: 'flex', flexDirection: 'column', gap: 16 },
  orderCard: { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNum: { fontSize: 15, fontWeight: 700, color: '#1e293b' },
  orderDate: { display: 'block', fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },

  itemsPreview: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  itemChip: { display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#475569' },
  chipImg: { width: 20, height: 20, borderRadius: 4, objectFit: 'cover' },
  chipEmoji: { fontSize: 14 },
  chipQty: { color: '#94a3b8', fontWeight: 600 },

  progressBar: { height: 4, borderRadius: 4, background: '#e2e8f0', marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },

  orderFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  totalLabel: { fontSize: 12, color: '#94a3b8' },
  totalValue: { fontSize: 18, fontWeight: 800, color: '#16a34a' },
  payBadge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 },
};
