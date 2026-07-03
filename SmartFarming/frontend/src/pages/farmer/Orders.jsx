import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { farmerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';

const ORDER_STEPS = [
  { key: 'pending', label: 'Pending', icon: '🔔' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅', next: 'processing', action: '⚙️ Start Processing' },
  { key: 'processing', label: 'Processing', icon: '⚙️', next: 'packed', action: '📦 Mark Packed' },
  { key: 'packed', label: 'Packed', icon: '📦', next: 'dispatched', action: '🚚 Dispatch' },
  { key: 'dispatched', label: 'Dispatched', icon: '🚚', next: 'in_transit', action: '🚛 In Transit' },
  { key: 'in_transit', label: 'In Transit', icon: '🚛', next: 'out_for_delivery', action: '🏍️ Out for Delivery' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🏍️' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

export default function FarmerOrders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);

  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await farmerAPI.getOrders(1, 200);
      const data = res.data;
      setOrders(Array.isArray(data) ? data : data.orders || data.data || []);
    } catch { setOrders([]); }
  };

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await farmerAPI.acceptOrder(orderId);
      toast.success('Order accepted! 🎉');
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to accept'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(rejectModal);
    try {
      await farmerAPI.rejectOrder(rejectModal, rejectReason);
      toast.success('Order rejected');
      setRejectModal(null); setRejectReason('');
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to reject'); }
    finally { setActionLoading(null); }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      await farmerAPI.updateOrderStatus(orderId, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}!`);
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to update'); }
    finally { setActionLoading(null); }
  };

  const handleDeliveryOTP = async (orderId) => {
    setActionLoading(orderId);
    try {
      await farmerAPI.sendDeliveryOtp(orderId);
      toast.success('Delivery OTP sent to buyer! 📧');
      const otp = window.prompt('Enter the 6-digit OTP from buyer:');
      if (otp && otp.length === 6) {
        await farmerAPI.verifyDeliveryOtp(orderId, otp);
        toast.success('OTP verified! Order delivered! 🎉💰');
        fetchOrders();
      }
    } catch (e) { toast.error(e.response?.data?.error || 'OTP verification failed'); }
    finally { setActionLoading(null); }
  };

  const handleCODConfirm = async (orderId) => {
    if (!window.confirm('Confirm you have received cash payment for this order?')) return;
    setActionLoading(orderId);
    try {
      await farmerAPI.confirmCodDelivery(orderId);
      toast.success('Cash confirmed! Order delivered! 💰🎉');
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to confirm'); }
    finally { setActionLoading(null); }
  };

  const getStepInfo = (status) => ORDER_STEPS.find(s => s.key === status);
  const getStepIndex = (status) => ORDER_STEPS.findIndex(s => s.key === status);

  const getStatusColor = (status) => {
    const colors = { pending: '#f59e0b', confirmed: '#3b82f6', processing: '#8b5cf6', packed: '#6366f1', dispatched: '#0ea5e9', in_transit: '#14b8a6', out_for_delivery: '#f97316', delivered: '#22c55e', cancelled: '#ef4444' };
    return colors[status] || '#6b7280';
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'new') return o.status === 'pending';
    if (activeTab === 'active') return ['confirmed','processing','packed','dispatched','in_transit','out_for_delivery'].includes(o.status);
    if (activeTab === 'delivered') return o.status === 'delivered';
    if (activeTab === 'cancelled') return o.status === 'cancelled';
    return true;
  }).filter(o => !searchQuery || (o.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(o.id).includes(searchQuery));

  const stats = {
    total: orders.length,
    newOrders: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['confirmed','processing','packed','dispatched','in_transit','out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + parseFloat(o.total_price || o.total || 0), 0),
  };

  const tabs = [
    { key: 'all', label: '📋 All', count: stats.total },
    { key: 'new', label: '🔔 New', count: stats.newOrders },
    { key: 'active', label: '⚙️ Active', count: stats.active },
    { key: 'delivered', label: '✅ Delivered', count: stats.delivered },
    { key: 'cancelled', label: '❌ Cancelled', count: stats.cancelled },
  ];

  return (
    <SellerLayout title="Orders" subtitle="Manage incoming orders">
      {/* Stats */}
      <div className="seller-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {[
          { label: 'Total Orders', value: stats.total, icon: '📦', color: 'green' },
          { label: 'New Orders', value: stats.newOrders, icon: '🔔', color: 'amber' },
          { label: 'Active', value: stats.active, icon: '⚙️', color: 'blue' },
          { label: 'Delivered', value: stats.delivered, icon: '✅', color: 'teal' },
          { label: 'Revenue', value: `₹${stats.revenue.toFixed(0)}`, icon: '💰', color: 'green' },
        ].map((s, i) => (
          <div key={i} className="seller-stat-card" style={s.label === 'New Orders' && stats.newOrders > 0 ? { border: '2px solid #f59e0b', animation: 'sellerGlow 2s infinite' } : {}}>
            <div className={`seller-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="seller-stat-info">
              <p>{s.label}</p>
              <h3>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="seller-card" style={{ marginBottom: 16 }}>
        <div className="seller-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 18px' }}>
          <div className="seller-tabs-pill" style={{ marginBottom: 0 }}>
            {tabs.map(tab => (
              <button key={tab.key} className={`seller-tab-pill ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <input type="text" placeholder="🔍 Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="seller-form-input" style={{ maxWidth: 220, padding: '8px 14px' }} />
        </div>
      </div>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="seller-card">
          <div className="seller-empty-state">
            <div className="empty-icon">🛒</div>
            <h3>No orders found</h3>
            <p>Orders matching this filter will appear here</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredOrders.map(order => {
            const stepInfo = getStepInfo(order.status);
            const currentIdx = getStepIndex(order.status);
            const isPending = order.status === 'pending';
            const isDelivered = order.status === 'delivered';
            const isCancelled = order.status === 'cancelled';
            const isLoading = actionLoading === (order.id || order._id);
            const orderId = order.id || order._id;

            return (
              <div key={orderId} className="seller-card" style={isPending ? { border: '2px solid #f59e0b40' } : {}}>
                {/* New Order Banner */}
                {isPending && (
                  <div style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', padding: '8px 20px', color: '#78350f', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    🔔 NEW ORDER — Action Required!
                  </div>
                )}

                <div className="seller-card-body">
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#14532d', fontSize: '0.95rem' }}>Order #{order.id}</span>
                      <span style={{ marginLeft: 12, fontSize: '0.75rem', color: '#9ca3af' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <span className={`seller-badge ${order.status === 'delivered' ? 'seller-badge-success' : order.status === 'cancelled' ? 'seller-badge-danger' : order.status === 'pending' ? 'seller-badge-warning' : 'seller-badge-info'}`}>
                      {stepInfo?.icon} {(order.status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Product + Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>{order.product_name || 'Product'}</p>
                      <p style={{ margin: '2px 0', fontSize: '0.78rem', color: '#6b7280' }}>
                        Qty: {order.quantity} · {order.payment_method === 'cod' ? '💰 COD' : '💳 Online'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#166534' }}>₹{order.total || order.total_price || 0}</p>
                    </div>
                  </div>

                  {/* Buyer Info */}
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: '1px solid rgba(22,163,74,0.08)' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#166534', fontSize: '0.82rem' }}>👤 Buyer Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Name</p>
                        <p style={{ margin: 0, fontWeight: 600, color: '#14532d', fontSize: '0.85rem' }}>{order.buyer_name || 'N/A'} {order.buyer_last_name || ''}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Phone</p>
                        <p style={{ margin: 0, fontWeight: 600, color: '#14532d', fontSize: '0.85rem' }}>📞 {order.buyer_phone || 'N/A'}</p>
                      </div>
                      {order.buyer_address && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <p style={{ margin: 0, fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Address</p>
                          <p style={{ margin: 0, color: '#14532d', fontSize: '0.82rem' }}>
                            📍 {[order.buyer_address, order.buyer_city, order.buyer_state].filter(Boolean).join(', ')}
                            {order.buyer_pincode && <span className="seller-badge seller-badge-info" style={{ marginLeft: 6 }}>PIN: {order.buyer_pincode}</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Stepper */}
                  {!isCancelled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f8fdf9', borderRadius: 10, padding: '8px 6px', marginBottom: 14 }}>
                      {ORDER_STEPS.map((step, i) => {
                        const isCompleted = i <= currentIdx;
                        const isCurrent = i === currentIdx;
                        return (
                          <React.Fragment key={step.key}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', background: isCompleted ? '#22c55e' : '#e5e7eb', color: isCompleted ? '#fff' : '#9ca3af', boxShadow: isCurrent ? '0 0 0 3px #22c55e40' : 'none' }}>
                                {isCompleted ? step.icon : i + 1}
                              </div>
                              <span style={{ fontSize: '0.48rem', color: isCompleted ? '#166534' : '#9ca3af', marginTop: 2, fontWeight: isCurrent ? 700 : 400, textAlign: 'center', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {step.label}
                              </span>
                            </div>
                            {i < ORDER_STEPS.length - 1 && <div style={{ height: 2, flex: '0 0 6px', background: i < currentIdx ? '#22c55e' : '#e5e7eb', borderRadius: 1, marginTop: -10 }} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isPending && (
                      <>
                        <button className="seller-btn seller-btn-primary" style={{ flex: 1 }} onClick={() => handleAccept(orderId)} disabled={isLoading}>
                          {isLoading ? '⏳...' : '✅ Accept Order'}
                        </button>
                        <button className="seller-btn" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a533' }} onClick={() => setRejectModal(orderId)} disabled={isLoading}>
                          ❌ Reject
                        </button>
                      </>
                    )}

                    {stepInfo?.next && !isPending && (
                      <button className="seller-btn seller-btn-primary" style={{ flex: 1 }} onClick={() => handleUpdateStatus(orderId, stepInfo.next)} disabled={isLoading}>
                        {isLoading ? '⏳ Updating...' : stepInfo.action}
                      </button>
                    )}

                    {order.status === 'out_for_delivery' && (
                      order.payment_method === 'online' ? (
                        <button className="seller-btn" style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }} onClick={() => handleDeliveryOTP(orderId)} disabled={isLoading}>
                          🔐 Verify OTP & Deliver
                        </button>
                      ) : (
                        <button className="seller-btn seller-btn-primary" style={{ flex: 1 }} onClick={() => handleCODConfirm(orderId)} disabled={isLoading}>
                          💰 Confirm Cash & Deliver
                        </button>
                      )
                    )}

                    {isDelivered && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
                        🎉 Order Complete!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="seller-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="seller-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="seller-modal-header">
              <h3>❌ Reject Order</h3>
              <button className="seller-modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="seller-modal-body">
              <div className="seller-form-group">
                <label className="seller-form-label">Reason for Rejection</label>
                <textarea className="seller-form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why you're rejecting this order..." />
              </div>
            </div>
            <div className="seller-modal-footer">
              <button className="seller-btn seller-btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="seller-btn seller-btn-danger" onClick={handleReject} disabled={actionLoading === rejectModal}>
                {actionLoading === rejectModal ? '⏳...' : '❌ Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
}
