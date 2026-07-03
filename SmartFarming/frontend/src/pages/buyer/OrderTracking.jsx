import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkoutAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiPhone, FiMapPin, FiClock, FiRefreshCw, FiX } from 'react-icons/fi';
import BuyerLayout from './BuyerLayout';
import SmartProductImage from '../../utils/SmartProductImage';

const TRACKING_STEPS = [
  { key: 'PLACED', icon: '🔔', label: 'Order Placed', desc: 'Your order has been placed' },
  { key: 'CONFIRMED', icon: '✅', label: 'Confirmed', desc: 'Payment verified, order confirmed' },
  { key: 'ACCEPTED', icon: '👨‍🌾', label: 'Farmer Accepted', desc: 'Farmer is preparing your order' },
  { key: 'PACKED', icon: '📦', label: 'Packed', desc: 'Order packed and ready for dispatch' },
  { key: 'OUT_FOR_DELIVERY', icon: '🚚', label: 'Out for Delivery', desc: 'On the way to your location' },
  { key: 'DELIVERED', icon: '🎉', label: 'Delivered', desc: 'Order delivered successfully!' },
];

export default function OrderTracking() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchOrder();
    // Poll every 5 seconds for live updates
    pollRef.current = setInterval(fetchOrder, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await checkoutAPI.getOrderDetail(id);
      if (res.data?.success) {
        setOrder(res.data.order);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await checkoutAPI.cancelOrder(order.id, 'Cancelled by buyer');
      if (res.data?.success) {
        toast.success('Order cancelled');
        fetchOrder();
      } else {
        toast.error(res.data?.error || 'Cannot cancel');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const getStepStatus = (stepKey) => {
    if (!order) return 'upcoming';
    if (order.order_status === 'CANCELLED') return stepKey === 'PLACED' ? 'completed' : 'cancelled';
    const currentIdx = TRACKING_STEPS.findIndex(s => s.key === order.order_status);
    const stepIdx = TRACKING_STEPS.findIndex(s => s.key === stepKey);
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  const getStepTime = (stepKey) => {
    if (!order?.tracking) return null;
    const entry = order.tracking.find(t => t.status === stepKey);
    if (entry?.created_at) {
      return new Date(entry.created_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    }
    return null;
  };

  const canCancel = order && !['PACKED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].includes(order.order_status);

  if (loading) {
    return (
      <BuyerLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={styles.spinner} />
          <p style={{color:'#94a3b8',marginTop:12}}>Loading order...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </BuyerLayout>
    );
  }

  if (!order) {
    return (
      <BuyerLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{fontSize:64}}>❌</div>
          <p style={{color:'#1e293b',fontSize:18,marginTop:16}}>Order not found</p>
          <button onClick={() => navigate('/buyer/orders')} style={styles.backToOrders}>Back to Orders</button>
        </div>
      </BuyerLayout>
    );
  }

  const isCancelled = order.order_status === 'CANCELLED';

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/buyer/orders')} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem',
            fontWeight: 600, transition: 'all 0.2s', textDecoration: 'none', outline: 'none'
          }}>
            <FiArrowLeft size={16} /> Back
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>📍 Track Order</h2>
        </div>
        <button onClick={fetchOrder} style={styles.refreshBtn}>
          <FiRefreshCw size={16} />
        </button>
      </div>

      <div style={styles.container}>
        {/* Order Info Card */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <div>
              <div style={styles.infoLabel}>Order Number</div>
              <div style={styles.infoValue}>{order.order_number}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={styles.infoLabel}>Total Amount</div>
              <div style={{...styles.infoValue, color:'#22c55e', fontSize:22}}>₹{parseFloat(order.total_amount || 0).toFixed(0)}</div>
            </div>
          </div>
          <div style={styles.infoDivider} />
          <div style={styles.infoRow}>
            <div>
              <div style={styles.infoLabel}>Payment</div>
              <div style={styles.infoValue}>
                {order.payment_method === 'cod' ? '💵 Cash on Delivery' : '💳 Paid Online'}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={styles.infoLabel}>Placed On</div>
              <div style={styles.infoValue}>
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  day:'numeric',month:'short',year:'numeric'
                }) : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📦 Items</h3>
          {(order.items || []).map((item, i) => (
            <div key={i} style={styles.itemRow}>
              <SmartProductImage product={{ name: item.product_name, category: item.product_category, images: item.product_image }} alt={item.product_name} style={styles.itemImg} />
              <div style={{flex:1}}>
                <div style={styles.itemName}>{item.product_name}</div>
                <div style={styles.itemMeta}>₹{parseFloat(item.unit_price||0).toFixed(0)} × {item.quantity}</div>
              </div>
              <div style={styles.itemTotal}>₹{parseFloat(item.total_price||0).toFixed(0)}</div>
            </div>
          ))}
        </div>

        {/* Live Tracking Timeline */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            {isCancelled ? '❌ Order Cancelled' : '🔴 Live Tracking'}
            {!isCancelled && <span style={styles.liveDot} />}
          </h3>

          <div style={styles.timeline}>
            {TRACKING_STEPS.map((step, idx) => {
              const status = getStepStatus(step.key);
              const time = getStepTime(step.key);
              const isLast = idx === TRACKING_STEPS.length - 1;

              return (
                <div key={step.key} style={styles.timelineStep}>
                  {/* Connector line */}
                  {!isLast && (
                    <div style={{
                      ...styles.connector,
                      background: status === 'completed' ? '#22c55e' : 'rgba(148,163,184,0.15)',
                    }} />
                  )}

                  {/* Node */}
                  <div style={{
                    ...styles.node,
                    ...(status === 'completed' ? styles.nodeCompleted : {}),
                    ...(status === 'current' ? styles.nodeCurrent : {}),
                    ...(status === 'cancelled' ? styles.nodeCancelled : {}),
                  }}>
                    {status === 'completed' ? '✓' : step.icon}
                  </div>

                  {/* Content */}
                  <div style={styles.stepContent}>
                    <div style={{
                      ...styles.stepLabel,
                      color: status === 'upcoming' ? '#64748b' : '#f1f5f9',
                      fontWeight: status === 'current' ? 700 : 600,
                    }}>
                      {step.label}
                    </div>
                    <div style={styles.stepDesc}>{step.desc}</div>
                    {time && <div style={styles.stepTime}><FiClock size={10} /> {time}</div>}
                    {status === 'current' && !isCancelled && (
                      <div style={styles.currentBadge}>● Current Status</div>
                    )}
                  </div>
                </div>
              );
            })}

            {isCancelled && (
              <div style={styles.cancelledInfo}>
                <FiX size={16} color="#ef4444" />
                <span>{order.cancel_reason || 'Order was cancelled'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Farmer Info */}
        {order.farmer_name && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>👨‍🌾 Farmer Details</h3>
            <div style={styles.farmerInfo}>
              <div style={styles.farmerAvatar}>
                {order.farmer_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={styles.farmerName}>{order.farmer_name}</div>
                <div style={styles.farmerLocation}><FiMapPin size={12} /> {order.farmer_location || 'Location'}</div>
              </div>
              {order.farmer_phone && (
                <a href={`tel:${order.farmer_phone}`} style={styles.callBtn}>
                  <FiPhone size={16} /> Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Delivery Address */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}><FiMapPin size={16} /> Delivery Address</h3>
          <p style={styles.addressText}>{order.delivery_address || 'Not provided'}</p>
        </div>

        {/* Price Breakdown */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>💰 Price Breakdown</h3>
          <div style={styles.priceRow}><span>Subtotal</span><span>₹{parseFloat(order.subtotal||0).toFixed(2)}</span></div>
          <div style={styles.priceRow}><span>Delivery Fee</span>
            <span style={parseFloat(order.delivery_fee||0) === 0 ? {color:'#22c55e'} : {}}>
              {parseFloat(order.delivery_fee||0) === 0 ? 'FREE' : `₹${parseFloat(order.delivery_fee).toFixed(2)}`}
            </span>
          </div>
          <div style={styles.priceDivider} />
          <div style={{...styles.priceRow, fontWeight:700, fontSize:16, color:'#f1f5f9'}}>
            <span>Total</span>
            <span style={{color:'#22c55e'}}>₹{parseFloat(order.total_amount||0).toFixed(2)}</span>
          </div>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling} style={styles.cancelBtn}>
            {cancelling ? 'Cancelling...' : '❌ Cancel Order'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </BuyerLayout>
  );
}

const styles = {
  spinner: { width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
  backToOrders: { marginTop: 16, padding: '10px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, color: '#2563eb', cursor: 'pointer', fontSize: 14, fontWeight: 600 },

  refreshBtn: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  container: { maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },

  infoCard: { background: 'linear-gradient(145deg, #eff6ff, #fff)', borderRadius: 16, padding: 20, border: '1px solid #bfdbfe', boxShadow: '0 2px 12px rgba(59,130,246,0.08)' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginTop: 4 },
  infoDivider: { height: 1, background: '#e2e8f0', margin: '12px 0' },

  card: { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 },

  itemRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  itemImg: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover' },
  itemImgPlaceholder: { width: 44, height: 44, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  itemName: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  itemMeta: { fontSize: 12, color: '#94a3b8' },
  itemTotal: { fontSize: 15, fontWeight: 700, color: '#16a34a' },

  // Timeline
  liveDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginLeft: 8, animation: 'pulse 1.5s infinite' },
  timeline: { position: 'relative', paddingLeft: 8 },
  timelineStep: { display: 'flex', gap: 16, position: 'relative', paddingBottom: 24, minHeight: 56 },
  connector: { position: 'absolute', left: 17, top: 38, width: 2, height: 'calc(100% - 38px)', borderRadius: 1 },
  node: { width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: '2px solid #e2e8f0', zIndex: 2 },
  nodeCompleted: { background: '#f0fdf4', borderColor: '#22c55e', color: '#22c55e', fontSize: 14, fontWeight: 700 },
  nodeCurrent: { background: '#eff6ff', borderColor: '#3b82f6', boxShadow: '0 0 16px rgba(59,130,246,0.2)' },
  nodeCancelled: { background: '#f8fafc', borderColor: '#e2e8f0' },
  stepContent: { flex: 1, paddingTop: 4 },
  stepLabel: { fontSize: 14, fontWeight: 600 },
  stepDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  stepTime: { fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 },
  currentBadge: { display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '3px 10px', borderRadius: 10, marginTop: 6 },

  cancelledInfo: { display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', borderRadius: 10, padding: '10px 14px', marginTop: 8, fontSize: 13, color: '#ef4444' },

  // Farmer
  farmerInfo: { display: 'flex', alignItems: 'center', gap: 14 },
  farmerAvatar: { width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 },
  farmerName: { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  farmerLocation: { fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  callBtn: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 16px', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },

  addressText: { fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 },

  // Price
  priceRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', margin: '8px 0' },
  priceDivider: { height: 1, background: '#e2e8f0', margin: '10px 0' },

  cancelBtn: { width: '100%', padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
