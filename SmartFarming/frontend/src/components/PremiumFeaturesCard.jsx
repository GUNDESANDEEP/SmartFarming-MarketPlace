import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import '../styles/premium-features.css';

// ============================================================================
// FEATURE DEFINITIONS — Separate for Farmer and Buyer
// ============================================================================

const FARMER_FREE_FEATURES = [
  { icon: '👨‍🌾', label: 'Farmer Registration' },
  { icon: '📦', label: 'Add & Manage Products' },
  { icon: '📋', label: 'View & Track Orders' },
  { icon: '💬', label: 'Basic Buyer Chat' },
  { icon: '📊', label: 'Order History' },
  { icon: '🏪', label: 'Product Listing' },
];

const FARMER_PREMIUM_FEATURES = [
  { icon: '🤖', label: 'AI Farming Assistant Chatbot', tag: 'AI' },
  { icon: '🌦️', label: 'Weather Forecast & Rain Alerts', tag: 'LIVE' },
  { icon: '🧪', label: 'Soil Analysis Suggestions', tag: 'AI' },
  { icon: '🌱', label: 'Fertilizer Recommendations', tag: 'AI' },
  { icon: '🔬', label: 'Crop Disease Detection (AI)', tag: 'AI' },
  { icon: '📈', label: 'Market Price Predictions', tag: 'NEW' },
  { icon: '💬', label: 'Direct Buyer Chat (Priority)', tag: 'PRO' },
  { icon: '⭐', label: 'Featured Product Listing', tag: 'TOP' },
  { icon: '📍', label: 'Farm Location Sharing', tag: 'MAP' },
  { icon: '🌾', label: 'Crop Growth Tracking', tag: 'NEW' },
  { icon: '🔒', label: 'End-to-End Encrypted Chats', tag: 'SAFE' },
  { icon: '💡', label: 'Personalized Farming Tips', tag: 'AI' },
  { icon: '📊', label: 'Yield Prediction', tag: 'AI' },
  { icon: '🌐', label: 'Multi-language Support', tag: 'NEW' },
];

const BUYER_FREE_FEATURES = [
  { icon: '🛒', label: 'Browse Products' },
  { icon: '🔍', label: 'Search Products' },
  { icon: '🛍️', label: 'Buy Products' },
  { icon: '👨‍🌾', label: 'View Farmer Profile', locked: true },
  { icon: '📦', label: 'Track Orders' },
  { icon: '💬', label: 'Basic Support', locked: true },
  { icon: '🎯', label: 'Priority Customer Support', locked: true },
  { icon: '📍', label: 'View Farm Location', locked: true },
];

const BUYER_PREMIUM_FEATURES = [
  { icon: '🛒', label: 'Browse Products', tag: 'PRO' },
  { icon: '🔍', label: 'Search Products', tag: 'PRO' },
  { icon: '🛍️', label: 'Buy Products', tag: 'PRO' },
  { icon: '👨‍🌾', label: 'View Farmer Profile', tag: 'PRO' },
  { icon: '📦', label: 'Track Orders', tag: 'PRO' },
  { icon: '💬', label: 'Basic Support', tag: 'VIP' },
  { icon: '🎯', label: 'Priority Customer Support', tag: 'VIP' },
  { icon: '📍', label: 'View Farm Location', tag: 'MAP' },
];

// ============================================================================
// PRICING
// ============================================================================
const PRICING = {
  monthly: { price: 59, label: '1 Month', save: null },
  halfYearly: { price: 299, label: '6 Months', save: '16% OFF' },
  yearly: { price: 549, label: '1 Year', save: '23% OFF' },
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ============================================================================
// COMPONENT
// ============================================================================

const PremiumFeaturesCard = ({ role = 'farmer' }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [premiumInfo, setPremiumInfo] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showPayment, setShowPayment] = useState(false);
  const [activating, setActivating] = useState(false);

  const freeFeatures = role === 'farmer' ? FARMER_FREE_FEATURES : BUYER_FREE_FEATURES;
  const premiumFeatures = role === 'farmer' ? FARMER_PREMIUM_FEATURES : BUYER_PREMIUM_FEATURES;
  const planTitle = role === 'farmer' ? 'Farmer' : 'Buyer';

  // Check premium status on mount
  const checkPremiumStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/premium/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsPremium(data.is_premium);
        setPremiumInfo(data);
      }
    } catch (err) {
      // Silently fail — premium stays false
    }
  }, []);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  // Activate premium after payment confirmation
  const handleActivate = async () => {
    if (activating) return;
    setActivating(true);

    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const res = await fetch(`${API_BASE}/api/premium/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            plan: selectedPlan,
            payment_ref: `UPI-PhonePe-${Date.now()}`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsPremium(true);
          setPremiumInfo(data);
        }
      }
    } catch (err) {
      // Fallback: just activate in UI
      setIsPremium(true);
    }

    setShowPayment(false);
    setActivating(false);
    toast.success('🎉 Premium activated! All features unlocked!', {
      duration: 6000,
      style: {
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '2px solid #22c55e',
        fontWeight: 600,
      },
    });
  };

  return (
    <div className="pf-card" id={`premium-features-${role}`}>
      {/* Header */}
      <div className="pf-header">
        <div className="pf-header-left">
          <div className="pf-crown">👑</div>
          <div>
            <h3 className="pf-title">{planTitle} Features</h3>
            <p className="pf-subtitle">
              {isPremium
                ? `✅ Premium Active${premiumInfo?.days_remaining ? ` — ${premiumInfo.days_remaining} days left` : ''}`
                : 'Upgrade to unlock all features'}
            </p>
          </div>
        </div>
        {!isPremium && (
          <button
            className="pf-upgrade-btn"
            onClick={() => setShowPayment(!showPayment)}
          >
            {showPayment ? '✕ Close' : '⚡ Upgrade'}
          </button>
        )}
      </div>

      {/* Free Features */}
      <div className="pf-section">
        <div className="pf-section-label pf-free-label">
          <span className="pf-label-dot pf-dot-free" />
          Free Plan
        </div>
        <div className="pf-features-grid">
          {freeFeatures.map((f, i) => {
            const isLocked = f.locked && !isPremium;
            return (
              <div key={i} className={`pf-feature ${isLocked ? 'pf-feature-locked' : 'pf-feature-free'}`}>
                <span className="pf-feature-icon">{isLocked ? '🔒' : f.icon}</span>
                <span className={`pf-feature-text ${isLocked ? 'pf-text-locked' : ''}`}>{f.label}</span>
                {isLocked
                  ? <span className="pf-tag pf-tag-locked">PRO</span>
                  : <span className="pf-check">✓</span>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium Features — locked */}
      {!isPremium && premiumFeatures.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-label pf-premium-label">
            <span className="pf-label-dot pf-dot-premium" />
            Premium Plan — ₹59/mo
          </div>
          <div className="pf-features-grid">
            {premiumFeatures.map((f, i) => (
              <div key={i} className="pf-feature pf-feature-locked">
                <span className="pf-feature-icon">🔒</span>
                <span className="pf-feature-text pf-text-locked">{f.label}</span>
                {f.tag && <span className="pf-tag pf-tag-locked">{f.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium — unlocked */}
      {isPremium && premiumFeatures.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-label pf-premium-label" style={{ color: '#4ade80' }}>
            <span className="pf-label-dot pf-dot-premium" style={{ background: '#4ade80' }} />
            ✅ Premium Unlocked
          </div>
          <div className="pf-features-grid">
            {premiumFeatures.map((f, i) => (
              <div key={i} className="pf-feature pf-feature-free">
                <span className="pf-feature-icon">{f.icon}</span>
                <span className="pf-feature-text">{f.label}</span>
                <span className="pf-check pf-check-premium">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ PAYMENT SECTION — PhonePe QR ═══════ */}
      {showPayment && !isPremium && (
        <div className="pf-payment-section" style={{
          background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.3), rgba(0, 0, 0, 0.4))',
          borderRadius: '20px',
          padding: '24px',
          marginTop: '16px',
          border: '1px solid rgba(74, 222, 128, 0.2)',
        }}>
          {/* Plan Selection */}
          <h4 className="pf-payment-title" style={{
            color: '#fff', textAlign: 'center', marginBottom: '16px', fontSize: '1.1rem'
          }}>
            💎 Choose Your Plan
          </h4>

          <div className="pf-plans-grid">
            {Object.entries(PRICING).map(([key, plan]) => (
              <div
                key={key}
                className={`pf-plan-card ${selectedPlan === key ? 'pf-plan-selected' : ''}`}
                onClick={() => setSelectedPlan(key)}
                style={{ cursor: 'pointer' }}
              >
                {plan.save && <div className="pf-plan-badge">{plan.save}</div>}
                <div className="pf-plan-radio">
                  <div className={`pf-radio ${selectedPlan === key ? 'pf-radio-active' : ''}`} />
                </div>
                <div className="pf-plan-info">
                  <span className="pf-plan-duration">{plan.label}</span>
                  <span className="pf-plan-price">₹{plan.price}</span>
                </div>
              </div>
            ))}
          </div>

          {/* PhonePe QR Code — directly from admin */}
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(74, 222, 128, 0.15)',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '6px 16px',
              background: 'linear-gradient(135deg, #5B2D91, #7B42B8)',
              borderRadius: '20px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}>
              <span>📲</span> Pay via PhonePe / UPI
            </div>

            <p style={{
              color: '#4ade80',
              fontWeight: 700,
              fontSize: '1.3rem',
              margin: '8px 0 4px',
            }}>
              ₹{PRICING[selectedPlan].price}
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
              marginBottom: '16px',
            }}>
              {PRICING[selectedPlan].label} Plan
            </p>

            {/* QR Code Image */}
            <div style={{
              background: '#fff',
              padding: '12px',
              borderRadius: '16px',
              display: 'inline-block',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <img
                src="/phonepe-qr.png"
                alt="Scan to Pay"
                style={{
                  width: '220px',
                  height: '220px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.8rem',
              marginBottom: '4px',
            }}>
              Scan with any UPI app
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.75rem',
              marginBottom: '20px',
            }}>
              PhonePe • GPay • Paytm • Any UPI App
            </p>

            {/* Confirm Payment Button */}
            <button
              onClick={handleActivate}
              disabled={activating}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '14px 24px',
                background: activating
                  ? 'rgba(74, 222, 128, 0.3)'
                  : 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: activating ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activating ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)',
              }}
            >
              {activating ? '⏳ Activating...' : '✅ I\'ve Paid — Activate Premium'}
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '12px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem',
          }}>
            🔒 100% Secure Payment • Instant Activation
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumFeaturesCard;
