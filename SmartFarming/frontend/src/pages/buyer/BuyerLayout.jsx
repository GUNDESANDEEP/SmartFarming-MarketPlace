import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import '../../styles/buyer.css';

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      { key: 'dashboard', path: '/buyer/dashboard', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    title: 'Shopping',
    items: [
      { key: 'marketplace', path: '/buyer/marketplace', icon: '🛒', label: 'Marketplace' },
      { key: 'cart', path: '/buyer/cart', icon: '🧺', label: 'My Cart' },
      { key: 'checkout', path: '/buyer/checkout', icon: '💳', label: 'Checkout' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { key: 'chat', path: '/buyer/chat', icon: '💬', label: 'Chat with Farmers' },
      { key: 'alerts', path: '/buyer/alerts', icon: '🔔', label: 'Price-Drop Alerts' },
    ],
  },
  {
    title: 'Smart Features',
    items: [
      { key: 'early-access', path: '/buyer/early-access', icon: '🚀', label: 'Early Product Access' },
      { key: 'recommendations', path: '/buyer/recommendations', icon: '✨', label: 'Recommendations' },
      { key: 'ai-assistant', path: '/farmer/agribot', icon: '🤖', label: 'AI Shopping Assistant' },
      { key: 'deals', path: '/buyer/deals', icon: '🎁', label: 'Exclusive Deals' },
    ],
  },
  {
    title: 'VIP Premium',
    items: [
      { key: 'vip', path: '/buyer/vip', icon: '👑', label: 'VIP Offers' },
      { key: 'first-access', path: '/buyer/vip#first-access', icon: '⚡', label: 'First Access' },
      { key: 'priority', path: '/buyer/vip#priority', icon: '🛡️', label: 'Top Priority Support' },
      { key: 'future-ai', path: '/buyer/vip#future-ai', icon: '🔮', label: 'Future AI Features' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { key: 'orders', path: '/buyer/orders', icon: '📋', label: 'My Orders' },
    ],
  },
  {
    title: 'Account',
    items: [
      { key: 'profile', path: '/buyer/profile', icon: '👤', label: 'My Profile' },
      { key: 'settings', path: '/buyer/settings', icon: '⚙️', label: 'Settings' },
    ],
  },
];

const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'order', icon: '📦', title: 'Order Update', text: 'Your order is out for delivery', time: '5 min ago', unread: true },
  { id: 2, type: 'promo', icon: '🎉', title: 'Special Offer', text: '20% off on organic vegetables!', time: '1 hour ago', unread: true },
  { id: 3, type: 'delivery', icon: '✅', title: 'Delivered', text: 'Order #SF-20260624-1234 delivered', time: '3 hours ago', unread: false },
];

export default function BuyerLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifPanelOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const displayName = user?.name || user?.first_name || 'Buyer';
  const nameParts = displayName.split(' ');
  const userInitials = `${(nameParts[0] || 'B')[0]}${(nameParts[1] || '')[0] || ''}`.toUpperCase();
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const profileMenuItems = [
    { icon: '👤', label: 'My Profile', path: '/buyer/profile' },
    { icon: '⚙️', label: 'Settings', path: '/buyer/settings' },
    { icon: '🛒', label: 'Marketplace', path: '/buyer/marketplace' },
    { icon: '📋', label: 'My Orders', path: '/buyer/orders' },
    { icon: '🧺', label: 'My Cart', path: '/buyer/cart' },
  ];

  return (
    <div className="buyer-layout">
      {/* Mobile overlay */}
      <div
        className={`buyer-sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`buyer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="buyer-sidebar-brand">
          <div className="brand-icon">🛍️</div>
          <div>
            <h2>SmartFarmer</h2>
            <span>Buyer Dashboard</span>
          </div>
        </div>

        <div className="buyer-sidebar-user">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{displayName}</div>
            <div className="user-role">Verified Buyer</div>
          </div>
        </div>

        <nav className="buyer-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="buyer-nav-section">
              <div className="buyer-nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`buyer-nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  style={{ textDecoration: 'none', color: 'inherit', WebkitTapHighlightColor: 'rgba(59,130,246,0.2)', touchAction: 'manipulation' }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="buyer-sidebar-footer">
          <button className="buyer-logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="buyer-main">
        <div className="buyer-topbar">
          <div className="buyer-topbar-left">
            <button className="buyer-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <div>
              <h1>SmartFarmer</h1>
            </div>
          </div>

          <div className="buyer-topbar-right">
            {/* Cart Quick Button */}
            <button
              className="buyer-topbar-btn"
              onClick={() => navigate('/buyer/cart')}
              title="Cart"
            >
              🧺
            </button>

            {/* Notifications Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="buyer-topbar-btn"
                onClick={() => { setNotifPanelOpen(!notifPanelOpen); setProfileMenuOpen(false); }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="badge-count">{unreadCount}</span>
                )}
              </button>

              {notifPanelOpen && (
                <div className="buyer-notif-panel">
                  <div className="buyer-notif-panel-header">
                    <h3>🔔 Notifications</h3>
                    <button onClick={markAllRead}>Mark all read</button>
                  </div>
                  <div className="buyer-notif-list">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div
                        key={n.id}
                        className={`buyer-notif-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                          if (n.type === 'order' || n.type === 'delivery') navigate('/buyer/orders');
                          setNotifPanelOpen(false);
                        }}
                      >
                        <div className={`notif-icon ${n.type}`}>{n.icon}</div>
                        <div className="notif-content">
                          <p className="notif-title">{n.title}</p>
                          <p className="notif-text">{n.text}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="buyer-notif-empty">
                        <div className="empty-bell">🔔</div>
                        <p>No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                className={`buyer-profile-trigger ${profileMenuOpen ? 'open' : ''}`}
                onClick={() => { setProfileMenuOpen(!profileMenuOpen); setNotifPanelOpen(false); }}
              >
                <div className="profile-avatar">{userInitials}</div>
                <div className="profile-info">
                  <span className="profile-name">{displayName}</span>
                  <span className="profile-role">Buyer</span>
                </div>
                <span className="profile-chevron">▼</span>
              </button>

              {profileMenuOpen && (
                <div className="buyer-dropdown">
                  <div className="buyer-dropdown-header">
                    <h4>{displayName}</h4>
                    <p>{user?.email || user?.phone || 'Verified Buyer'}</p>
                  </div>

                  {profileMenuItems.map(item => (
                    <button
                      key={item.path}
                      className="buyer-dropdown-item"
                      onClick={() => handleNav(item.path)}
                    >
                      <span className="item-icon">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}

                  <div className="buyer-dropdown-divider" />

                  <button className="buyer-dropdown-item danger" onClick={handleLogout}>
                    <span className="item-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="buyer-content">
          {children}
        </div>
      </main>
    </div>
  );
}
