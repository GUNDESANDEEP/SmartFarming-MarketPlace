import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { FiCheck, FiPackage, FiMapPin, FiClock } from 'react-icons/fi';
import { checkoutAPI } from '../../services/api';
import toast from 'react-hot-toast';
import BuyerLayout from './BuyerLayout';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(location.state || {});
  const [showCheck, setShowCheck] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Check for Stripe redirect (session_id in URL params)
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    if (sessionId) {
      // Verify Stripe payment
      setVerifying(true);
      checkoutAPI.verifyStripe({ session_id: sessionId, order_id: orderId })
        .then(res => {
          const data = res.data;
          if (data.success) {
            setOrder({
              order_id: data.order_id || orderId,
              total_amount: data.total_amount || 0,
              payment_method: 'stripe',
              payment_status: 'PAID',
              transaction_id: data.transaction_id,
            });
            toast.success('Payment verified successfully!');
          } else {
            toast.error(data.error || 'Payment verification failed');
          }
        })
        .catch(() => {
          toast.error('Could not verify payment');
        })
        .finally(() => {
          setVerifying(false);
          setTimeout(() => setShowCheck(true), 300);
          setTimeout(() => setShowDetails(true), 800);
        });
    } else if (!order.order_id) {
      navigate('/buyer/marketplace');
      return;
    } else {
      setTimeout(() => setShowCheck(true), 300);
      setTimeout(() => setShowDetails(true), 800);
    }
  }, []);

  const isCOD = order.payment_method === 'cod';

  return (
    <BuyerLayout>
      <div style={styles.container}>
        {/* Success Animation */}
        <div style={{
          ...styles.checkCircle,
          transform: showCheck ? 'scale(1)' : 'scale(0)',
          opacity: showCheck ? 1 : 0,
        }}>
          <div style={styles.checkInner}>
            <FiCheck size={48} strokeWidth={3} color="#fff" />
          </div>
          <div style={styles.ripple} />
          <div style={styles.ripple2} />
        </div>

        {/* Title */}
        <h1 style={{
          ...styles.title,
          opacity: showCheck ? 1 : 0,
          transform: showCheck ? 'translateY(0)' : 'translateY(20px)',
        }}>
          {isCOD ? '🛒 Order Confirmed!' : '✅ Payment Successful!'}
        </h1>

        {/* Amount */}
        <div style={{
          ...styles.amountCard,
          opacity: showDetails ? 1 : 0,
          transform: showDetails ? 'translateY(0)' : 'translateY(20px)',
        }}>
          {!isCOD && (
            <div style={styles.amountLabel}>Amount Paid</div>
          )}
          <div style={styles.amount}>₹{parseFloat(order.total_amount || 0).toFixed(2)}</div>
          <div style={styles.paymentBadge}>
            {isCOD ? '💵 Cash on Delivery' : `💳 Paid Online`}
          </div>
          {order.transaction_id && (
            <div style={styles.txnId}>Transaction: {order.transaction_id}</div>
          )}
        </div>

        {/* Order Details */}
        <div style={{
          ...styles.detailCard,
          opacity: showDetails ? 1 : 0,
          transform: showDetails ? 'translateY(0)' : 'translateY(20px)',
          transitionDelay: '0.2s',
        }}>
          <div style={styles.detailRow}>
            <FiPackage size={18} color="#22c55e" />
            <div>
              <div style={styles.detailLabel}>Order Number</div>
              <div style={styles.detailValue}>{order.order_number}</div>
            </div>
          </div>
          <div style={styles.detailRow}>
            <FiClock size={18} color="#3b82f6" />
            <div>
              <div style={styles.detailLabel}>Estimated Delivery</div>
              <div style={styles.detailValue}>1-3 Business Days</div>
            </div>
          </div>
          <div style={styles.detailRow}>
            <FiMapPin size={18} color="#f59e0b" />
            <div>
              <div style={styles.detailLabel}>Status</div>
              <div style={styles.detailValue}>
                {isCOD ? 'Order Confirmed — Farmer will accept soon' : 'Payment Verified — Order Confirmed'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          ...styles.actions,
          opacity: showDetails ? 1 : 0,
        }}>
          <button
            onClick={() => navigate(`/buyer/orders/${order.order_id}`)}
            style={styles.trackBtn}
          >
            📍 Track Order
          </button>
          <button
            onClick={() => navigate('/buyer/orders')}
            style={styles.ordersBtn}
          >
            📋 View All Orders
          </button>
          <button
            onClick={() => navigate('/buyer/marketplace')}
            style={styles.shopBtn}
          >
            🛒 Continue Shopping
          </button>
        </div>

        {/* Confetti-like dots */}
        {showCheck && (
          <div style={styles.confettiContainer}>
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                ...styles.confettiDot,
                left: `${10 + Math.random() * 80}%`,
                top: `${5 + Math.random() * 30}%`,
                animationDelay: `${i * 0.1}s`,
                background: ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6'][i % 5],
                width: 6 + Math.random() * 6,
                height: 6 + Math.random() * 6,
              }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </BuyerLayout>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  container: { textAlign: 'center', padding: 40, maxWidth: 480, width: '100%', position: 'relative', zIndex: 2 },

  checkCircle: { width: 100, height: 100, margin: '0 auto 24px', position: 'relative', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' },
  checkInner: { width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 40px rgba(34,197,94,0.4)', position: 'relative', zIndex: 2 },
  ripple: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(34,197,94,0.4)', animation: 'ripple 1.5s ease-out infinite' },
  ripple2: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(34,197,94,0.3)', animation: 'ripple 1.5s ease-out infinite 0.5s' },

  title: { fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 24px', transition: 'all 0.5s ease' },

  amountCard: { background: 'rgba(30,41,59,0.8)', borderRadius: 20, padding: '24px 32px', border: '1px solid rgba(34,197,94,0.2)', margin: '0 0 20px', backdropFilter: 'blur(20px)', transition: 'all 0.6s ease' },
  amountLabel: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  amount: { fontSize: 42, fontWeight: 800, color: '#22c55e', margin: '8px 0', letterSpacing: '-1px' },
  paymentBadge: { display: 'inline-block', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 14, fontWeight: 600, padding: '6px 16px', borderRadius: 20 },
  txnId: { fontSize: 11, color: '#64748b', marginTop: 8 },

  detailCard: { background: 'rgba(30,41,59,0.6)', borderRadius: 16, padding: 20, border: '1px solid rgba(148,163,184,0.08)', margin: '0 0 24px', transition: 'all 0.6s ease' },
  detailRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid rgba(148,163,184,0.06)', textAlign: 'left' },
  detailLabel: { fontSize: 11, color: '#64748b', fontWeight: 500 },
  detailValue: { fontSize: 14, color: '#e2e8f0', fontWeight: 600 },

  actions: { display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.5s ease' },
  trackBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(22,163,74,0.3)', animation: 'pulse 2s infinite' },
  ordersBtn: { width: '100%', padding: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 14, color: '#60a5fa', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  shopBtn: { width: '100%', padding: '14px', background: 'transparent', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 14, color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  confettiContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 },
  confettiDot: { position: 'absolute', borderRadius: '50%', animation: 'confettiFall 2s ease-out forwards' },
};
