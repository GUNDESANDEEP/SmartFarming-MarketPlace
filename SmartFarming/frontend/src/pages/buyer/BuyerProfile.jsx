import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiEdit3, FiSave, FiShield, FiLoader } from 'react-icons/fi';
import BuyerLayout from './BuyerLayout';

export default function BuyerProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', location: '',
  });

  // Load profile from API on mount — ensures we have the latest data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAPI.getProfile();
      const data = res.data;
      const u = data.user || data.profile || data;
      const profile = data.profile || {};

      setForm({
        first_name: u.first_name || profile.first_name || user?.first_name || user?.name || '',
        last_name: u.last_name || profile.last_name || user?.last_name || '',
        email: u.email || profile.email || user?.email || '',
        phone: u.phone || profile.phone || user?.phone || '',
        location: profile.location || u.location || user?.location || user?.city || '',
      });
    } catch {
      // Fallback to localStorage user data
      setForm({
        first_name: user?.first_name || user?.name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        location: user?.location || user?.city || '',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Save profile to API AND localStorage
  const handleSave = async () => {
    if (!form.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    setSaving(true);
    try {
      await authAPI.updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
      });

      // Update localStorage so data persists across navigation
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...storedUser,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
      };
      setUser(updatedUser);

      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.first_name
    ? `${form.first_name} ${form.last_name}`.trim()
    : user?.name || 'Buyer';
  const initials = displayName.charAt(0).toUpperCase();
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'June 2026';

  if (loading) {
    return (
      <BuyerLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <FiLoader size={28} className="spin" style={{ color: '#3b82f6' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
        </div>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}>
          <FiArrowLeft size={18} /> Back
        </Link>
        <h2 style={S.pageTitle}>👤 My Profile</h2>
      </div>

      {/* Profile Hero */}
      <div style={S.profileHero}>
        <div style={S.heroContent}>
          <div style={S.avatarLarge}>{initials}</div>
          <div>
            <h2 style={S.heroName}>{displayName}</h2>
            <p style={S.heroSub}>
              <FiShield size={14} style={{ marginRight: 4 }} />
              Verified Buyer · Member since {joinDate}
            </p>
          </div>
        </div>
        <button
          onClick={() => { if (editing) handleSave(); else setEditing(true); }}
          style={S.editBtn}
          disabled={saving}
        >
          {saving ? (
            <>Saving...</>
          ) : editing ? (
            <><FiSave size={16} /> Save</>
          ) : (
            <><FiEdit3 size={16} /> Edit Profile</>
          )}
        </button>
      </div>

      {/* Profile Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Personal Information */}
        <div className="buyer-card">
          <div className="buyer-card-header"><h3>📋 Personal Information</h3></div>
          <div className="buyer-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={S.fieldRow}>
              <div style={S.fieldIcon}><FiUser size={18} color="#3b82f6" /></div>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>First Name</label>
                {editing ? (
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} style={S.fieldInput} />
                ) : (
                  <p style={S.fieldValue}>{form.first_name || '--'}</p>
                )}
              </div>
            </div>
            <div style={S.fieldRow}>
              <div style={S.fieldIcon}><FiUser size={18} color="#3b82f6" /></div>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>Last Name</label>
                {editing ? (
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} style={S.fieldInput} />
                ) : (
                  <p style={S.fieldValue}>{form.last_name || '--'}</p>
                )}
              </div>
            </div>
            <div style={S.fieldRow}>
              <div style={S.fieldIcon}><FiMail size={18} color="#8b5cf6" /></div>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>Email</label>
                {editing ? (
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={S.fieldInput} />
                ) : (
                  <p style={S.fieldValue}>{form.email || '--'}</p>
                )}
              </div>
            </div>
            <div style={S.fieldRow}>
              <div style={S.fieldIcon}><FiPhone size={18} color="#16a34a" /></div>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>Phone</label>
                {editing ? (
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={S.fieldInput} />
                ) : (
                  <p style={S.fieldValue}>{form.phone || '--'}</p>
                )}
              </div>
            </div>
            <div style={S.fieldRow}>
              <div style={S.fieldIcon}><FiMapPin size={18} color="#f59e0b" /></div>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>Location</label>
                {editing ? (
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={S.fieldInput} />
                ) : (
                  <p style={S.fieldValue}>{form.location || '--'}</p>
                )}
              </div>
            </div>
            {editing && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={handleSave} className="buyer-btn buyer-btn-primary" disabled={saving} style={{ flex: 1 }}>
                  <FiSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); fetchProfile(); }} className="buyer-btn buyer-btn-secondary" style={{ flex: 0 }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Stats & Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account Stats */}
          <div className="buyer-card">
            <div className="buyer-card-header"><h3>📊 Account Overview</h3></div>
            <div className="buyer-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={S.statBox}>
                  <span style={S.statEmoji}>🛒</span>
                  <div>
                    <p style={S.statNum}>0</p>
                    <p style={S.statLabel}>Total Orders</p>
                  </div>
                </div>
                <div style={S.statBox}>
                  <span style={S.statEmoji}>✅</span>
                  <div>
                    <p style={S.statNum}>0</p>
                    <p style={S.statLabel}>Delivered</p>
                  </div>
                </div>
                <div style={S.statBox}>
                  <span style={S.statEmoji}>💰</span>
                  <div>
                    <p style={S.statNum}>₹0</p>
                    <p style={S.statLabel}>Total Spent</p>
                  </div>
                </div>
                <div style={S.statBox}>
                  <span style={S.statEmoji}>⭐</span>
                  <div>
                    <p style={S.statNum}>--</p>
                    <p style={S.statLabel}>Reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="buyer-card">
            <div className="buyer-card-header"><h3>⚡ Quick Actions</h3></div>
            <div className="buyer-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="buyer-btn buyer-btn-secondary" onClick={() => navigate('/buyer/orders')} style={{ width: '100%', justifyContent: 'center' }}>
                📋 View My Orders
              </button>
              <button className="buyer-btn buyer-btn-secondary" onClick={() => navigate('/buyer/marketplace')} style={{ width: '100%', justifyContent: 'center' }}>
                🛒 Browse Marketplace
              </button>
              <button className="buyer-btn buyer-btn-secondary" onClick={() => navigate('/buyer/cart')} style={{ width: '100%', justifyContent: 'center' }}>
                🧺 View Cart
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="buyer-card">
            <div className="buyer-card-header"><h3>🔒 Security</h3></div>
            <div className="buyer-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>Account Verified</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#16a34a' }}>Your account is secure and verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  profileHero: { background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', position: 'relative', overflow: 'hidden' },
  heroContent: { display: 'flex', alignItems: 'center', gap: 20, zIndex: 2 },
  avatarLarge: { width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: '#fff', backdropFilter: 'blur(10px)' },
  heroName: { fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px' },
  heroSub: { fontSize: '0.82rem', opacity: 0.85, margin: 0, display: 'flex', alignItems: 'center' },
  editBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(10px)', zIndex: 2 },
  fieldRow: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  fieldIcon: { width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fieldLabel: { display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldValue: { margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' },
  fieldInput: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  statBox: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' },
  statEmoji: { fontSize: '1.5rem' },
  statNum: { margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' },
  statLabel: { margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 },
};
