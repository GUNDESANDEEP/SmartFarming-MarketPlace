import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiBell, FiCreditCard, FiLogOut, FiChevronRight, FiSave, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import BuyerLayout from './BuyerLayout';
import apiClient from '../../services/api';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: '₹0', period: '/mo', color: '#64748b', bg: '#f8fafc', features: ['Basic marketplace', 'Standard delivery', 'Chat support'] },
  { id: 'pro', name: 'Pro', price: '₹99', period: '/mo', color: '#3b82f6', bg: '#eff6ff', features: ['Price-drop alerts', 'Early access', 'AI assistant', 'Priority support'], popular: true },
  { id: 'vip', name: 'VIP', price: '₹249', period: '/mo', color: '#f59e0b', bg: '#fffbeb', features: ['All Pro features', 'VIP offers', 'First access', 'Highest priority', 'Future AI'], badge: '👑' },
];

export default function BuyerSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    price_drop_alerts: true,
    order_updates: true,
    promotional_emails: false,
    subscription_plan: 'free',
    auto_renew: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => { fetchSettings(); }, []);

  // Verify Stripe subscription payment on redirect back
  useEffect(() => {
    const subStatus = searchParams.get('subscription');
    const sessionId = searchParams.get('session_id');
    const plan = searchParams.get('plan');
    if (subStatus === 'success' && sessionId) {
      toast.loading('Verifying subscription...', { id: 'sub-verify' });
      apiClient.post('/premium/verify-stripe-subscription', { session_id: sessionId, plan: plan || 'pro' })
        .then(res => {
          const data = res.data;
          if (data.success) {
            toast.dismiss('sub-verify');
            toast.success(data.message || 'Subscription activated!');
            setSettings(prev => ({ ...prev, subscription_plan: plan || 'pro' }));
          } else {
            toast.dismiss('sub-verify');
            toast.error(data.error || 'Verification failed');
          }
        })
        .catch(() => { toast.dismiss('sub-verify'); toast.error('Could not verify subscription'); });
    } else if (subStatus === 'cancelled') {
      toast('Subscription cancelled', { icon: '⚠️' });
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/buyer/settings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        const flat = {};
        for (const [key, val] of Object.entries(data.settings)) {
          flat[key] = val.value === 'true' ? true : val.value === 'false' ? false : val.value;
        }
        setSettings(prev => ({ ...prev, ...flat }));
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const selectPlan = (planId) => {
    setSettings(prev => ({ ...prev, subscription_plan: planId }));
    setDirty(true);
  };

  // Subscribe via Stripe
  const handleSubscribe = async (planId) => {
    if (planId === 'free') {
      selectPlan('free');
      return;
    }
    try {
      toast.loading('Redirecting to Stripe...', { id: 'stripe-sub' });
      const res = await apiClient.post('/premium/create-stripe-subscription', { plan: planId });
      const data = res.data;
      toast.dismiss('stripe-sub');
      if (data.success && data.session_url) {
        window.location.href = data.session_url;
      } else {
        toast.error(data.error || 'Failed to create subscription session');
      }
    } catch (err) {
      toast.dismiss('stripe-sub');
      toast.error('Could not connect to Stripe. Try again.');
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const payload = {};
      for (const [key, value] of Object.entries(settings)) {
        payload[key] = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
      }
      const res = await fetch(`${API}/buyer/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved!');
        setDirty(false);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.name || user?.first_name || 'Buyer';
  const userEmail = user?.email || '';
  const userInitial = (displayName[0] || 'B').toUpperCase();
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === (settings.subscription_plan || 'free'));

  if (loading) {
    return (
      <BuyerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={S.spinner} />
            <p style={{ marginTop: 16, color: '#94a3b8' }}>Loading settings...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}><FiArrowLeft size={18} /> Back</Link>
        <h2 style={S.pageTitle}>⚙️ Settings</h2>
      </div>

      {/* ─── 1. PROFILE SECTION ─── */}
      <div className="buyer-card" style={{ marginBottom: 16 }}>
        <Link to="/buyer/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={S.menuItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ ...S.avatarCircle, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                {userInitial}
              </div>
              <div>
                <p style={S.menuLabel}>{displayName}</p>
                <p style={S.menuSub}>{userEmail || 'View and edit your profile'}</p>
              </div>
            </div>
            <FiChevronRight size={20} color="#94a3b8" />
          </div>
        </Link>
      </div>

      {/* ─── 2. NOTIFICATIONS ─── */}
      <div className="buyer-card" style={{ marginBottom: 16 }}>
        <div style={{ ...S.sectionHeader, cursor: 'pointer' }} onClick={() => setActiveSection(activeSection === 'notif' ? null : 'notif')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...S.iconCircle, background: '#fef3c7', color: '#f59e0b' }}><FiBell size={18} /></div>
            <div>
              <p style={S.menuLabel}>Notifications</p>
              <p style={S.menuSub}>Manage alerts and updates</p>
            </div>
          </div>
          <FiChevronRight size={20} color="#94a3b8" style={{ transform: activeSection === 'notif' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {activeSection === 'notif' && (
          <div style={{ borderTop: '1px solid #f1f5f9' }}>
            {[
              { key: 'notifications_enabled', label: 'Push Notifications', desc: 'Real-time order and delivery updates', color: '#3b82f6' },
              { key: 'price_drop_alerts', label: 'Price-Drop Alerts', desc: 'Get notified when prices drop', color: '#16a34a' },
              { key: 'order_updates', label: 'Order Updates', desc: 'SMS and email order status', color: '#8b5cf6' },
              { key: 'promotional_emails', label: 'Promotional Emails', desc: 'Offers and seasonal deals', color: '#f59e0b' },
            ].map((item, idx, arr) => (
              <div key={item.key} style={{ ...S.toggleRow, borderBottom: idx < arr.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{item.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>{item.desc}</p>
                </div>
                <button onClick={() => toggleSetting(item.key)} style={S.toggleBtn} aria-label={`Toggle ${item.label}`}>
                  {settings[item.key]
                    ? <FiToggleRight size={30} color={item.color} />
                    : <FiToggleLeft size={30} color="#cbd5e1" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. SUBSCRIPTION PLANS ─── */}
      <div className="buyer-card" style={{ marginBottom: 16 }}>
        <div style={{ ...S.sectionHeader, cursor: 'pointer' }} onClick={() => setActiveSection(activeSection === 'sub' ? null : 'sub')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...S.iconCircle, background: '#dbeafe', color: '#3b82f6' }}><FiCreditCard size={18} /></div>
            <div>
              <p style={S.menuLabel}>Subscription Plan</p>
              <p style={S.menuSub}>Current: <strong style={{ color: currentPlan?.color }}>{currentPlan?.name || 'Free'}</strong> — {currentPlan?.price}{currentPlan?.period}</p>
            </div>
          </div>
          <FiChevronRight size={20} color="#94a3b8" style={{ transform: activeSection === 'sub' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {activeSection === 'sub' && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {SUBSCRIPTION_PLANS.map(plan => {
                const isActive = (settings.subscription_plan || 'free') === plan.id;
                return (
                  <div key={plan.id} onClick={() => selectPlan(plan.id)} style={{
                    border: `2px solid ${isActive ? plan.color : '#e2e8f0'}`,
                    borderRadius: 14,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    background: isActive ? plan.bg : '#fff',
                    transition: 'all 0.2s',
                    position: 'relative',
                    boxShadow: isActive ? `0 4px 16px ${plan.color}18` : 'none',
                  }}>
                    {plan.popular && <div style={{ position: 'absolute', top: -10, right: 10, background: plan.color, color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>⭐ Popular</div>}
                    {plan.badge && <span style={{ fontSize: '1.3rem', position: 'absolute', top: 10, right: 12 }}>{plan.badge}</span>}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: plan.color }}>{plan.price}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{plan.period}</span>
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{plan.name}</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ fontSize: '0.72rem', color: '#64748b', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: plan.color, fontWeight: 700 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {isActive && <div style={{ marginTop: 10, fontSize: '0.7rem', fontWeight: 700, color: plan.color, textAlign: 'center' }}>✅ Current Plan</div>}
                    {!isActive && plan.id !== 'free' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSubscribe(plan.id); }}
                        style={{ marginTop: 10, width: '100%', padding: '8px 0', border: 'none', borderRadius: 8, background: plan.color, color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
                      >
                        💳 Subscribe with Card
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Auto Renew */}
            <div style={{ ...S.toggleRow, marginTop: 14, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>🔄 Auto-Renew</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Automatically renew each month</p>
              </div>
              <button onClick={() => toggleSetting('auto_renew')} style={S.toggleBtn}>
                {settings.auto_renew ? <FiToggleRight size={30} color="#16a34a" /> : <FiToggleLeft size={30} color="#cbd5e1" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. SIGN OUT ─── */}
      <div className="buyer-card" style={{ marginBottom: 16 }}>
        <button onClick={handleLogout} style={{ ...S.menuItem, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...S.iconCircle, background: '#fee2e2', color: '#ef4444' }}><FiLogOut size={18} /></div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ ...S.menuLabel, color: '#ef4444' }}>Sign Out</p>
              <p style={S.menuSub}>Log out of your account</p>
            </div>
          </div>
          <FiChevronRight size={20} color="#fca5a5" />
        </button>
      </div>

      {/* Save button */}
      {dirty && (
        <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <button onClick={saveSettings} disabled={saving} style={S.saveBtn}>
            <FiSave size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Footer Note */}
      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#cbd5e1', marginTop: 12 }}>
        🗄️ All settings are stored in the database and persist until you remove them.
      </p>
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  spinner: { width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },
  menuItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', touchAction: 'manipulation' },
  menuLabel: { margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' },
  menuSub: { margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' },
  avatarCircle: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem', fontWeight: 800, flexShrink: 0 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px' },
  toggleBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, touchAction: 'manipulation' },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 14, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(37,99,235,0.35)', touchAction: 'manipulation' },
};
