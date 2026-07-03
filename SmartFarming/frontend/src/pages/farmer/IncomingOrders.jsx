import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkoutAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { FiCheck, FiX, FiPackage, FiTruck, FiDollarSign, FiRefreshCw, FiClock, FiPhone, FiMapPin } from 'react-icons/fi';

const STATUS_FLOW = {
  CONFIRMED:  { next: 'ACCEPTED', action: '✅ Accept Order', color: '#3b82f6' },
  ACCEPTED:   { next: 'PACKED', action: '📦 Mark Packed', color: '#8b5cf6' },
  PACKED:     { next: 'OUT_FOR_DELIVERY', action: '🚚 Dispatch', color: '#f97316' },
  OUT_FOR_DELIVERY: { next: 'DELIVERED', action: '🎉 Mark Delivered', color: '#22c55e' },
};

const STATUS_BADGES = {
  PLACED:           { label: 'New Order', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  CONFIRMED:        { label: 'Confirmed', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ACCEPTED:         { label: 'Accepted', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  PACKED:           { label: 'Packed', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  DELIVERED:        { label: 'Delivered', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  CANCELLED:        { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const TABS = [
  { key: 'new', label: '🔔 New', filter: s => ['PLACED','CONFIRMED'].includes(s) },
  { key: 'active', label: '⚙️ Active', filter: s => ['ACCEPTED','PACKED','OUT_FOR_DELIVERY'].includes(s) },
  { key: 'delivered', label: '✅ Done', filter: s => s === 'DELIVERED' },
  { key: 'cancelled', label: '❌ Cancelled', filter: s => s === 'CANCELLED' },
];

export default function IncomingOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('new');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [prevOrderCount, setPrevOrderCount] = useState(0);
  const pollRef = useRef(null);
  const failCountRef = useRef(0);

  useEffect(() => {
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch {}
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await checkoutAPI.getFarmerOrders();
      const newOrders = res.data?.orders || [];
      
      // Reset error state on success
      failCountRef.current = 0;
      setError(null);
      
      // Play sound on new order
      const newCount = newOrders.filter(o => ['PLACED','CONFIRMED'].includes(o.order_status)).length;
      if (newCount > prevOrderCount && prevOrderCount > 0) {
        playSound();
        toast('🔔 New order received!', { icon: '🛒', style: { background: '#1e293b', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' } });
      }
      setPrevOrderCount(newCount);
      
      setOrders(newOrders);
    } catch (err) {
      failCountRef.current += 1;
      // Stop polling after 3 consecutive failures to prevent hammering a dead server
      if (failCountRef.current >= 3 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      // Only show error on first load or after repeated failures
      if (loading || failCountRef.current >= 3) {
        const msg = err?._silentAuthRedirect ? 'Session expired. Please login again.'
          : err?._isNetworkError ? 'Backend server is not reachable. Make sure it is running.'
          : err?.response?.status === 404 ? 'Checkout API not available. Make sure the backend is running with main.py (FastAPI).'
          : 'Failed to load orders. Retrying...';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await checkoutAPI.acceptOrder(orderId);
      toast.success('Order accepted! 🎉');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Enter a reason'); return; }
    setActionLoading(rejectModal);
    try {
      await checkoutAPI.rejectOrder(rejectModal, rejectReason);
      toast.success('Order rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      await checkoutAPI.updateStatus(orderId, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollectCash = async (orderId) => {
    setActionLoading(orderId);
    try {
      await checkoutAPI.collectCash(orderId);
      toast.success('Cash collected! 💰');
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);
  const filteredOrders = orders.filter(o => currentTab.filter(o.order_status));

  const content = (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h2 style={styles.pageTitle}>🛒 Incoming Orders</h2>
        <button onClick={fetchOrders} style={styles.refreshBtn}><FiRefreshCw size={16} /> Refresh</button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'New', count: orders.filter(o => ['PLACED','CONFIRMED'].includes(o.order_status)).length, color: '#f59e0b', emoji: '🔔' },
          { label: 'Active', count: orders.filter(o => ['ACCEPTED','PACKED','OUT_FOR_DELIVERY'].includes(o.order_status)).length, color: '#3b82f6', emoji: '⚙️' },
          { label: 'Delivered', count: orders.filter(o => o.order_status === 'DELIVERED').length, color: '#22c55e', emoji: '✅' },
          { label: 'Total Revenue', count: `₹${orders.filter(o=>o.order_status==='DELIVERED').reduce((s,o)=>s+parseFloat(o.subtotal||0),0).toFixed(0)}`, color: '#8b5cf6', emoji: '💰' },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <span style={{fontSize:20}}>{s.emoji}</span>
            <div style={{...styles.statCount, color: s.color}}>{s.count}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map(tab => {
          const count = orders.filter(o => tab.filter(o.order_status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
            >
              {tab.label}
              {count > 0 && <span style={styles.tabCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
        </div>
      ) : error ? (
        <div style={styles.emptyBox}>
          <div style={{fontSize:48}}>⚠️</div>
          <p style={{color:'#f87171',marginTop:12,fontWeight:600}}>{error}</p>
          <button
            onClick={() => { failCountRef.current = 0; setError(null); setLoading(true); fetchOrders(); if (!pollRef.current) { pollRef.current = setInterval(fetchOrders, 15000); } }}
            style={styles.refreshBtn}
          >
            🔄 Retry
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={{fontSize:48}}>📭</div>
          <p style={{color:'#94a3b8',marginTop:12}}>No orders in this category</p>
        </div>
      ) : (
        <div style={styles.orderGrid}>
          {filteredOrders.map(order => {
            const badge = STATUS_BADGES[order.order_status] || STATUS_BADGES.PLACED;
            const flow = STATUS_FLOW[order.order_status];
            const isCOD = order.payment_method === 'cod';
            const isNew = ['PLACED','CONFIRMED'].includes(order.order_status);

            return (
              <div key={order.id} style={{
                ...styles.orderCard,
                ...(isNew ? styles.orderCardNew : {}),
              }}>
                {/* Header */}
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.orderNum}>{order.order_number}</div>
                    <div style={styles.orderDate}>
                      {order.created_at ? new Date(order.created_at).toLocaleString('en-IN', {
                        day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'
                      }) : ''}
                    </div>
                  </div>
                  <div style={{...styles.statusBadge, color: badge.color, background: badge.bg}}>
                    {badge.label}
                  </div>
                </div>

                {/* Buyer Info */}
                <div style={styles.buyerRow}>
                  <div style={styles.buyerAvatar}>
                    {(order.buyer_name || order.buyer_display_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={styles.buyerName}>{order.buyer_name || order.buyer_display_name || 'Buyer'}</div>
                    <div style={styles.buyerPhone}><FiPhone size={11} /> {order.buyer_phone || order.buyer_display_phone || '-'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={styles.orderAmount}>₹{parseFloat(order.total_amount||0).toFixed(0)}</div>
                    <div style={{
                      ...styles.payMethodBadge,
                      color: isCOD ? '#f59e0b' : '#22c55e',
                      background: isCOD ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                    }}>
                      {isCOD ? '💵 COD' : '💳 Paid'}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={styles.itemsList}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={styles.itemChip}>
                      <span>{item.product_name}</span>
                      <span style={styles.itemQty}>x{item.quantity}</span>
                      <span style={styles.itemPrice}>₹{parseFloat(item.total_price||0).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Address */}
                {order.delivery_address && (
                  <div style={styles.addressRow}>
                    <FiMapPin size={12} color="#94a3b8" />
                    <span style={styles.addressText}>{order.delivery_address}</span>
                  </div>
                )}

                {/* Actions */}
                <div style={styles.actionsRow}>
                  {/* New order: Accept/Reject */}
                  {isNew && (
                    <>
                      <button
                        onClick={() => handleAccept(order.id)}
                        disabled={actionLoading === order.id}
                        style={styles.acceptBtn}
                      >
                        <FiCheck size={16} /> {actionLoading === order.id ? '...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => setRejectModal(order.id)}
                        style={styles.rejectBtn}
                      >
                        <FiX size={16} /> Reject
                      </button>
                    </>
                  )}

                  {/* Status progression */}
                  {flow && !isNew && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, flow.next)}
                      disabled={actionLoading === order.id}
                      style={{...styles.statusBtn, background: `${flow.color}20`, borderColor: `${flow.color}40`, color: flow.color}}
                    >
                      {actionLoading === order.id ? '...' : flow.action}
                    </button>
                  )}

                  {/* COD: Collect Cash button (when delivered) */}
                  {order.order_status === 'DELIVERED' && isCOD && order.payment_status !== 'CASH_COLLECTED' && (
                    <button
                      onClick={() => handleCollectCash(order.id)}
                      disabled={actionLoading === order.id}
                      style={styles.cashBtn}
                    >
                      <FiDollarSign size={16} /> {actionLoading === order.id ? '...' : 'Collect Cash'}
                    </button>
                  )}

                  {order.payment_status === 'CASH_COLLECTED' && (
                    <span style={styles.cashCollectedBadge}>✅ Cash Collected</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={styles.modalOverlay} onClick={() => setRejectModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Reject Order</h3>
            <p style={styles.modalDesc}>Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g., Out of stock, Cannot deliver to this location..."
              style={styles.modalTextarea}
            />
            <div style={styles.modalActions}>
              <button onClick={() => setRejectModal(null)} style={styles.modalCancel}>Cancel</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal} style={styles.modalReject}>
                {actionLoading === rejectModal ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return <SellerLayout>{content}</SellerLayout>;
}

const styles = {
  page: { padding: '0 0 40px', fontFamily: "'Inter', sans-serif" },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '8px 14px', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'rgba(30,41,59,0.6)', borderRadius: 14, padding: '16px 14px', textAlign: 'center', border: '1px solid rgba(148,163,184,0.08)' },
  statCount: { fontSize: 22, fontWeight: 800, marginTop: 4 },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  tabBar: { display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 },
  tab: { padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(34,197,94,0.15)', borderColor: '#22c55e', color: '#22c55e' },
  tabCount: { background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 700 },

  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: { width: 32, height: 32, border: '3px solid #334155', borderTop: '3px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
  emptyBox: { textAlign: 'center', padding: 60, background: 'rgba(30,41,59,0.4)', borderRadius: 16 },

  orderGrid: { display: 'flex', flexDirection: 'column', gap: 16 },
  orderCard: { background: 'rgba(30,41,59,0.7)', borderRadius: 16, padding: 20, border: '1px solid rgba(148,163,184,0.1)', transition: 'all 0.2s' },
  orderCardNew: { borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(30,41,59,0.8)', boxShadow: '0 0 20px rgba(245,158,11,0.05)' },

  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  orderNum: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' },
  orderDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8 },

  buyerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 12px', background: 'rgba(15,23,42,0.4)', borderRadius: 10 },
  buyerAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 },
  buyerName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  buyerPhone: { fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 },
  orderAmount: { fontSize: 18, fontWeight: 800, color: '#22c55e' },
  payMethodBadge: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginTop: 4, display: 'inline-block' },

  itemsList: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 },
  itemChip: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', padding: '4px 0' },
  itemQty: { color: '#64748b', fontWeight: 600, fontSize: 12 },
  itemPrice: { marginLeft: 'auto', color: '#94a3b8', fontWeight: 600 },

  addressRow: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 14, padding: '8px 10px', background: 'rgba(15,23,42,0.3)', borderRadius: 8 },
  addressText: { lineHeight: 1.4, flex: 1 },

  actionsRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  acceptBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: '#22c55e', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  rejectBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  statusBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: '1px solid', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1, justifyContent: 'center' },
  cashBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#f59e0b', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  cashCollectedBadge: { fontSize: 13, color: '#22c55e', fontWeight: 600, padding: '8px 16px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1e293b', borderRadius: 20, padding: 28, maxWidth: 420, width: '90%', border: '1px solid rgba(148,163,184,0.15)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' },
  modalDesc: { fontSize: 13, color: '#94a3b8', margin: '0 0 16px' },
  modalTextarea: { width: '100%', minHeight: 80, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, padding: 12, color: '#f1f5f9', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' },
  modalActions: { display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  modalCancel: { padding: '10px 20px', background: 'transparent', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modalReject: { padding: '10px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
