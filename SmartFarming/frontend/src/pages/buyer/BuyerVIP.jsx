import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiStar, FiZap, FiShield, FiCpu, FiCheck } from 'react-icons/fi';
import BuyerLayout from './BuyerLayout';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

const VIP_FEATURES = [
  {
    id: 'vip-offers',
    icon: '👑',
    fiIcon: <FiStar size={22} />,
    title: 'VIP Offers',
    desc: 'Get exclusive VIP-only deals and early access to premium products from verified farmers.',
    color: '#f59e0b',
    bg: '#fffbeb',
    perks: ['Up to 30% extra discount', 'VIP-only product bundles', 'Free delivery on all orders', 'Priority order processing'],
  },
  {
    id: 'first-access',
    icon: '⚡',
    fiIcon: <FiZap size={22} />,
    title: 'First Access to Products',
    desc: 'Be the first to buy newly listed products — 24 hours before they appear on the marketplace.',
    color: '#3b82f6',
    bg: '#eff6ff',
    perks: ['24-hour early access window', 'Reserve products before launch', 'First-come quantity guarantee', 'Pre-order notifications'],
  },
  {
    id: 'priority',
    icon: '🛡️',
    fiIcon: <FiShield size={22} />,
    title: 'Highest Support Priority',
    desc: 'Skip the queue with priority customer support — your issues are resolved first.',
    color: '#16a34a',
    bg: '#f0fdf4',
    perks: ['Dedicated support agent', 'Response within 1 hour', 'Priority refund processing', 'Direct phone support line'],
  },
  {
    id: 'future-ai',
    icon: '🔮',
    fiIcon: <FiCpu size={22} />,
    title: 'Future AI Features',
    desc: 'Get early access to upcoming AI-powered features before they launch to everyone.',
    color: '#8b5cf6',
    bg: '#faf5ff',
    perks: ['AI price prediction', 'Smart reorder suggestions', 'Harvest timing alerts', 'Personalized nutrition plans'],
  },
];

export default function BuyerVIP() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);

  useEffect(() => { fetchPlan(); }, []);

  // Auto-scroll to hash section
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [location.hash, loading]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`${API}/buyer/settings`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success && data.settings?.subscription_plan) {
        setCurrentPlan(data.settings.subscription_plan.value || 'free');
      }
    } catch {} finally { setLoading(false); }
  };

  const activateFeature = async (featureId) => {
    setActivating(featureId);
    try {
      const res = await fetch(`${API}/buyer/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ settings: { [featureId.replace('-', '_')]: 'true' } }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${featureId.replace(/-/g, ' ')} activated! ✨`);
      }
    } catch {
      toast.error('Failed to activate');
    } finally {
      setActivating(null);
    }
  };

  const isVIP = currentPlan === 'vip';
  const isPro = currentPlan === 'pro' || isVIP;

  return (
    <BuyerLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>👑 VIP Premium</h2>
      </div>

      {/* VIP Status Banner */}
      <div style={{
        background: isVIP ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isPro ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #64748b, #475569)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: '8rem', opacity: 0.1 }}>👑</div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '1.5rem' }}>{isVIP ? '👑' : isPro ? '⭐' : '🎯'}</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {isVIP ? 'VIP Member' : isPro ? 'Pro Member' : 'Free Member'}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9 }}>
            {isVIP ? 'You have access to all premium features below!' :
             isPro ? 'Upgrade to VIP to unlock all features below.' :
             'Upgrade your plan in Settings to unlock VIP features.'}
          </p>
          {!isVIP && (
            <Link to="/buyer/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '8px 16px', color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
              Upgrade Plan →
            </Link>
          )}
        </div>
      </div>

      {/* VIP Feature Cards */}
      <div style={{ display: 'grid', gap: 16 }}>
        {VIP_FEATURES.map(feat => (
          <div key={feat.id} id={feat.id} className="buyer-card" style={{ overflow: 'hidden', border: location.hash === `#${feat.id}` ? `2px solid ${feat.color}` : undefined, transition: 'border 0.3s' }}>
            <div style={{ display: 'flex', gap: 18, padding: '22px 24px', alignItems: 'flex-start' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: feat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                {feat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>{feat.title}</h3>
                  {isVIP ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' }}>✅ Active</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>🔒 VIP Only</span>
                  )}
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>{feat.desc}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  {feat.perks.map((perk, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: isVIP ? '#16a34a' : '#94a3b8' }}>
                      <FiCheck size={14} color={isVIP ? '#16a34a' : '#cbd5e1'} /> {perk}
                    </div>
                  ))}
                </div>
                {isVIP && (
                  <button onClick={() => activateFeature(feat.id)} disabled={activating === feat.id}
                    style={{ marginTop: 12, padding: '8px 18px', background: feat.color, border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: activating === feat.id ? 0.7 : 1 }}>
                    {activating === feat.id ? 'Activating...' : `Activate ${feat.title}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
};
