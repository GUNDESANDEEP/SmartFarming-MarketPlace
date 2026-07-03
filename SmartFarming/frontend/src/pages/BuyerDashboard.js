import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiSearch, FiPlus, FiMinus, FiTrash2, FiPackage, FiStar, FiMapPin, FiPhone, FiDownload, FiEye, FiSave, FiCheck, FiChevronRight, FiCreditCard, FiTruck, FiShield, FiClock, FiChevronDown, FiArrowLeft, FiHeart, FiBell, FiSend, FiMessageCircle, FiFilter, FiSliders, FiTag, FiZap, FiGift, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { buyerAPI, paymentsAPI, messagingAPI, adminAPI } from '../services/api';
import ReceiptViewer from '../components/ReceiptViewer';
import '../styles/dashboard.css';
import PremiumFeaturesCard from '../components/PremiumFeaturesCard';
import UltraAIBanner from '../components/UltraAIBanner';


import { PLACEHOLDER_IMG } from '../utils/productImages';
import SmartProductImage from '../utils/SmartProductImage';

const BuyerShop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState({});
  const [notifiedDiscounts, setNotifiedDiscounts] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [wishlistedIds, setWishlistedIds] = useState(new Set());

  // Load wishlist IDs on mount
  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem('buyer_wishlist') || '[]');
    setWishlistedIds(new Set(wl.map(p => p.id)));
  }, []);

  const toggleWishlist = async (product) => {
    if (wishlistedIds.has(product.id)) {
      await buyerAPI.removeFromWishlist(product.id);
      setWishlistedIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
      toast('Removed from wishlist', { icon: '💔' });
    } else {
      await buyerAPI.addToWishlist(product);
      setWishlistedIds(prev => new Set(prev).add(product.id));
      toast.success('Added to wishlist!', { icon: '❤️' });
      buyerAPI.addNotification({ type: 'wishlist', title: 'Added to Wishlist', message: `${product.name} added to your wishlist`, icon: '❤️' });
    }
  };


  // 🔔 Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 - pleasant chime
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch (e) { /* Audio not supported */ }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔔 Notify buyers about new discounts
  useEffect(() => {
    if (products.length === 0) return;
    const discounted = products.filter(p => (p.discount || p.discount_percent) > 0);
    const newDiscounts = discounted.filter(p => !notifiedDiscounts.has(p.id));
    if (newDiscounts.length > 0) {
      playNotificationSound();
      if (newDiscounts.length === 1) {
        toast(`🔥 ${newDiscounts[0].name} is ${newDiscounts[0].discount || newDiscounts[0].discount_percent}% OFF!`, {
          icon: '🎉', duration: 5000,
          style: { background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #f59e0b', fontWeight: 600 },
        });
      } else {
        toast(`🔥 ${newDiscounts.length} products on discount! Check them out!`, {
          icon: '🎉', duration: 5000,
          style: { background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #f59e0b', fontWeight: 600 },
        });
      }
      setNotifiedDiscounts(prev => {
        const next = new Set(prev);
        newDiscounts.forEach(p => next.add(p.id));
        return next;
      });
    }
  }, [products, notifiedDiscounts, playNotificationSound]);

  const fetchProducts = async (search = '') => {
    setLoading(true);
    try {
      const response = await buyerAPI.getProducts(1, 40, search ? { search } : {});
      const data = response.data;
      // Handle multiple response shapes: { products: [] }, { data: [] }, or []
      const items = Array.isArray(data) ? data
        : Array.isArray(data?.products) ? data.products
        : Array.isArray(data?.data) ? data.data
        : [];
      setProducts(items);
      if (items.length === 0 && !search) {
        // Silently handle - cache or server empty
        console.log('[Shop] No products found');
      }
    } catch (error) {
      console.error('[Shop] Fetch error:', error.message);
      // Don't show error if products are already loaded from cache
      if (products.length === 0) {
        toast.error('Products loading slowly... Please wait.', { duration: 3000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(searchQuery);
  };

  const handleAddToCart = async (product) => {
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    try {
      await buyerAPI.addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`, { icon: '🛒' });
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to add to cart';
      if (msg.includes('already')) {
        toast.success(`${product.name} is already in your cart!`, { icon: '✅' });
      } else {
        toast.error(msg);
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const filteredProducts = products
    .filter(p =>
      (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.category?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!selectedCategory || p.category?.toLowerCase() === selectedCategory.toLowerCase()) &&
      (!organicOnly || p.organic) &&
      ((p.price || 0) >= priceRange[0] && (p.price || 0) <= priceRange[1])
    )
    .sort((a, b) => {
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'rating') return (b.average_rating || 0) - (a.average_rating || 0);
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });

  // Get low-stock and sold-out products for the ticker
  const lowStockProducts = products.filter(p => {
    const qty = parseFloat(p.quantity) || 0;
    return qty > 0 && qty <= 20;
  });

  const soldOutProducts = products.filter(p => {
    const qty = parseFloat(p.quantity) || 0;
    return qty <= 0 || p.status === 'sold_out';
  });

  return (
    <div className="dashboard-section">
      {/* === SCROLLING STOCK TICKER === */}
      {lowStockProducts.length > 0 && (
        <div className="stock-ticker-wrapper">
          <div className="stock-ticker-track">
            {/* Duplicate items for seamless infinite scroll */}
            {[...lowStockProducts, ...lowStockProducts].map((p, i) => (
              <div key={`${p.id}-${i}`} className="stock-ticker-item">
                <span className="ticker-dot" />
                <span>{p.name}</span>
                <span className="ticker-qty">Only {Math.floor(parseFloat(p.quantity))} {p.unit || 'units'} left!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="shop-header">
        <h2>🛒 Fresh Products</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, maxWidth: '500px' }}>
          <form onSubmit={handleSearch} className="search-bar" style={{ flex: 1 }}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="buyer-filter-toggle"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '9px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
              background: showFilters ? '#166534' : '#f0fdf4', color: showFilters ? '#fff' : '#166534',
              border: '1.5px solid #22c55e33', cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.3s', fontFamily: 'Poppins, sans-serif',
            }}
          >
            <FiFilter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* ═══ FILTER PANEL ═══ */}
      {showFilters && (
        <div className="buyer-filter-panel" style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: '14px', padding: '16px 20px',
          marginBottom: '16px', border: '1px solid rgba(22,163,74,0.1)',
          boxShadow: '0 4px 20px rgba(22,101,52,0.08)', animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', alignItems: 'end' }}>
            {/* Category */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid rgba(22,163,74,0.2)', fontSize: '0.85rem', fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fff' }}>
                <option value="">All Categories</option>
                <option value="vegetables">🥬 Vegetables</option>
                <option value="fruits">🍎 Fruits</option>
                <option value="grains">🌾 Grains</option>
                <option value="dairy">🥛 Dairy</option>
                <option value="spices">🌶️ Spices</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Price: ₹{priceRange[1]}</label>
              <input type="range" min="0" max="5000" step="50" value={priceRange[1]}
                onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                style={{ width: '100%', accentColor: '#22c55e' }} />
            </div>

            {/* Sort */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid rgba(22,163,74,0.2)', fontSize: '0.85rem', fontFamily: 'Poppins, sans-serif', outline: 'none', background: '#fff' }}>
                <option value="default">Default</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            {/* Organic Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#14532d' }}>
                <div onClick={() => setOrganicOnly(!organicOnly)} style={{
                  width: '42px', height: '24px', borderRadius: '12px', position: 'relative',
                  background: organicOnly ? '#22c55e' : '#e5e7eb', transition: 'background 0.3s', cursor: 'pointer',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '3px', left: organicOnly ? '21px' : '3px',
                    transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </div>
                🌿 Organic Only
              </label>
            </div>
          </div>

          {/* Active Filters Count + Clear */}
          {(selectedCategory || organicOnly || sortBy !== 'default' || priceRange[1] < 5000) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </span>
              <button onClick={() => { setSelectedCategory(''); setPriceRange([0, 5000]); setOrganicOnly(false); setSortBy('default'); }}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                ✕ Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading fresh products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={48} />
          <p>No products found</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product => {
            const qty = parseFloat(product.quantity) || 0;
            const isSoldOut = qty <= 0 || product.status === 'sold_out';
            const isLowStock = qty > 0 && qty <= 20;
            return (
            <div key={product.id} className={`product-card-buyer ${(product.discount || product.discount_percent) > 0 ? 'discount-shimmer' : ''}`}
              style={{ opacity: isSoldOut ? 0.7 : 1 }}>
              <div className="product-image" style={{ position: 'relative' }}>
                <SmartProductImage
                  product={product}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Wishlist Heart */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                  className="wishlist-heart-btn"
                  style={{
                    position: 'absolute', top: '8px', right: '8px', zIndex: 5,
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'all 0.3s',
                  }}
                >
                  <FiHeart size={16} fill={wishlistedIds.has(product.id) ? '#ef4444' : 'none'} color={wishlistedIds.has(product.id) ? '#ef4444' : '#9ca3af'} />
                </button>
                {product.organic && <span className="organic-badge">🌿 Organic</span>}
                {(product.discount || product.discount_percent) > 0 && (
                  <div className="discount-banner">
                    <span className="discount-text">🔥 {product.discount || product.discount_percent}% OFF</span>
                  </div>
                )}
                {/* SOLD OUT overlay on image */}
                {isSoldOut && (
                  <div className="sold-out-badge-buyer">
                    <span>SOLD OUT</span>
                  </div>
                )}
                {/* LOW STOCK badge on image */}
                {isLowStock && (
                  <div className="low-stock-indicator-buyer">
                    ⚡ Only {Math.floor(qty)} left!
                  </div>
                )}
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="farmer-name">
                  <FiMapPin size={12} /> {product.farmer_name || product.farmerName || 'Local Farmer'}
                  {product.farmer_location && ` • ${product.farmer_location}`}
                </p>
                <div className="product-meta">
                  <span className="category-tag">{product.category}</span>
                  {product.average_rating > 0 && (
                    <span className="rating"><FiStar size={12} /> {product.average_rating}</span>
                  )}
                  {isLowStock && (
                    <span style={{
                      background: 'rgba(239,68,68,0.1)', color: '#dc2626',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      Low Stock
                    </span>
                  )}
                </div>
                <div className="product-footer">
                  <div className="price-info">
                    {(product.discount || product.discount_percent) > 0 ? (
                      <>
                        <span className="price-original">₹{product.price}</span>
                        <span className="price">₹{(product.price * (1 - (product.discount || product.discount_percent) / 100)).toFixed(0)}</span>
                      </>
                    ) : (
                      <span className="price">₹{product.price}</span>
                    )}
                    <span className="unit">/{product.unit || 'kg'}</span>
                  </div>
                  {isSoldOut ? (
                    <button className="btn-add-cart" disabled
                      style={{ background: '#9ca3af', cursor: 'not-allowed', opacity: 0.7 }}>
                      Sold Out
                    </button>
                  ) : (
                    <button
                      className={`btn-add-cart ${addingToCart[product.id] ? 'adding' : ''}`}
                      onClick={() => handleAddToCart(product)}
                      disabled={addingToCart[product.id]}
                    >
                      {addingToCart[product.id] ? (
                        <span className="btn-loading">Adding...</span>
                      ) : (
                        <><FiShoppingCart size={14} /> Add</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BuyerCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({ deliveryFlat: 0, freeDeliveryThreshold: 500, gstPercent: 0, platformPercent: 0 });
  const navigate = useNavigate();

  const fetchCart = useCallback(async () => {
    try {
      const response = await buyerAPI.getCart();
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.items || data.cart || []);
      setCartItems(items);
      setSelectedItems(new Set(items.map(i => i.id)));
      setLoading(false);
    } catch (error) { setCartItems([]); setLoading(false); }
  }, []);

  const loadFeesFromLocalStorage = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('sf_admin_fees') || '{}');
      if (stored.deliveryFlat !== undefined || stored.gstPercent !== undefined) {
        setPlatformSettings(prev => ({
          ...prev,
          deliveryFlat: parseFloat(stored.deliveryFlat) ?? prev.deliveryFlat,
          freeDeliveryThreshold: stored.freeDeliveryThreshold ?? prev.freeDeliveryThreshold,
          gstPercent: parseFloat(stored.gstPercent) ?? prev.gstPercent,
          platformPercent: parseFloat(stored.platformPercent) ?? prev.platformPercent,
        }));
      }
    } catch {}
  };

  useEffect(() => {
    fetchCart();
    // Fetch platform settings for dynamic delivery fee
    adminAPI.getPlatformSettings().then(res => {
      const s = res.data;
      if (s && (s.delivery_flat !== undefined || s.deliveryFlat !== undefined)) {
        setPlatformSettings({
          deliveryFlat: s.delivery_flat ?? s.deliveryFlat ?? 0,
          freeDeliveryThreshold: s.free_delivery_threshold ?? s.freeDeliveryThreshold ?? 500,
          gstPercent: s.gst_percent ?? s.gstPercent ?? 0,
          platformPercent: s.platform_percent ?? s.platformPercent ?? 0,
        });
      } else {
        loadFeesFromLocalStorage();
      }
    }).catch(() => {
      loadFeesFromLocalStorage();
    });
    // Fetch user profile for address prefill
    (async () => {
      try {
        const res = await buyerAPI.getProfile();
        const p = res.data?.profile || res.data;
        if (p) {
          setUserProfile(p);
          if (p.house_number || p.address) setHouseNumber(p.house_number || p.address || '');
          if (p.location || p.street) setStreet(p.location || p.street || '');
          if (p.city) setCity(p.city);
          if (p.state) setAddrState(p.state);
          if (p.pincode) setPincode(String(p.pincode));
        }
      } catch {}
    })();
    // Real-time sync: listen for admin fee changes in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'sf_admin_fees') loadFeesFromLocalStorage();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await buyerAPI.updateCartItem(itemId, newQuantity);
      setCartItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (error) { toast.error('Failed to update quantity'); }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await buyerAPI.removeFromCart(itemId);
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Item removed from cart');
    } catch (error) { toast.error('Failed to remove item'); }
  };

  const handlePlaceOrder = async () => {
    if (!houseNumber.trim()) { toast.error('Please enter house number'); setCheckoutStep(2); return; }
    if (!pincode.trim() || !/^[0-9]{6}$/.test(pincode.trim())) { toast.error('Please enter valid 6-digit pincode'); setCheckoutStep(2); return; }
    setPlacing(true);
    try {
      if (paymentMethod === 'online') {
        const orderRes = await paymentsAPI.createOrder({
          amount: grandTotal, currency: 'INR', delivery_fee: deliveryFee,
          cart_items: cartItems.map(item => ({ product_id: item.product_id || item.id, quantity: Math.floor(item.quantity) || 1, price: item.price })),
          delivery_address: deliveryAddress, notes,
        });
        const { order_id, key_id, amount: amountPaise } = orderRes.data;
        const options = {
          key: key_id, amount: amountPaise, currency: 'INR', name: 'SmartFarm Marketplace',
          description: `${cartItems.length} item(s) - Fresh from Farm`, order_id,
          prefill: { name: localStorage.getItem('user_name') || '', email: localStorage.getItem('user_email') || '', contact: localStorage.getItem('user_phone') || '' },
          theme: { color: '#166534' },
          method: { upi: true, card: true, netbanking: true, wallet: true, paylater: true },
          config: { display: { blocks: { utib: { name: 'Pay using UPI', instruments: [{ method: 'upi', flows: ['qrcode', 'collect', 'intent'] }] } }, sequence: ['block.utib'], preferences: { show_default_blocks: true } } },
          handler: async function (response) {
            try {
              const verifyRes = await paymentsAPI.verifyPayment({
                razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature, delivery_address: deliveryAddress, notes,
                cart_items: cartItems.map(item => ({ product_id: item.product_id || item.id, quantity: Math.floor(item.quantity) || 1, price: item.price })),
              });
              setOrderSuccess(verifyRes.data); setCartItems([]);
              toast.success('Payment successful! Order placed! 🎉', { duration: 5000 });
            } catch (ve) { toast.error(ve.response?.data?.error || 'Payment verification failed.'); }
            finally { setPlacing(false); }
          },
          modal: { ondismiss: () => { setPlacing(false); toast('Payment cancelled', { icon: '⚠️' }); }, confirm_close: true },
        };
        if (typeof window.Razorpay === 'undefined') { toast.error('Payment gateway loading...'); setPlacing(false); return; }
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (r) => { setPlacing(false); toast.error(`Payment failed: ${r.error.description || 'Unknown'}`, { duration: 5000 }); });
        rzp.open(); return;
      } else {
        const res = await buyerAPI.checkout({ payment_method: paymentMethod, delivery_address: deliveryAddress, notes, delivery_fee: deliveryFee });
        setOrderSuccess(res.data); setCartItems([]);
        toast.success(`${res.data.orders?.length || 1} order(s) placed!`, { icon: '🎉', duration: 4000 });
      }
    } catch (error) { toast.error(error.response?.data?.error || 'Checkout failed'); }
    finally { setPlacing(false); }
  };

  const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));
  const total = selectedCartItems.reduce((sum, item) => sum + ((item.price || 0) * (Math.floor(item.quantity) || 1)), 0);
  const freeThreshold = platformSettings.freeDeliveryThreshold || 500;
  const deliveryFee = total >= freeThreshold ? 0 : (platformSettings.deliveryFlat || 0);
  const gstAmount = total * (platformSettings.gstPercent || 0) / 100;
  const platformFeeAmount = total * (platformSettings.platformPercent || 0) / 100;
  const grandTotal = total + deliveryFee + gstAmount + platformFeeAmount;
  const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;

  const toggleSelectItem = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (allSelected) setSelectedItems(new Set());
    else setSelectedItems(new Set(cartItems.map(i => i.id)));
  };
  const deliveryDate = new Date(); deliveryDate.setDate(deliveryDate.getDate() + 4);
  const deliveryDateStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const userName = userProfile?.first_name || localStorage.getItem('user_name') || 'Customer';
  const userPhone = userProfile?.phone || localStorage.getItem('user_phone') || '';
  const deliveryAddress = [houseNumber, street, city, addrState, pincode].filter(Boolean).join(', ');

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  // ── Order Success ──
  if (orderSuccess) {
    return (
      <div className="dashboard-section">
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '20px', border: '1px solid #22c55e33' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: '#14532d', marginBottom: '8px' }}>Order Placed Successfully!</h2>
          <p style={{ color: '#166534', fontSize: '1.1rem', marginBottom: '6px' }}>{orderSuccess.orders?.length || 1} order(s) • Total: ₹{orderSuccess.total_amount?.toFixed(2)}</p>
          <p style={{ color: '#15803d', fontSize: '0.9rem', marginBottom: '24px' }}>Payment: {orderSuccess.payment_method === 'cod' ? '💰 Cash on Delivery' : '💳 Online'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px', margin: '0 auto 24px' }}>
            {(orderSuccess.orders || []).map((o, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #22c55e22' }}>
                <span style={{ fontWeight: 600, color: '#14532d' }}>{o.order_number}</span>
                <span style={{ color: '#666' }}>{o.product_name} × {o.quantity}</span>
                <span style={{ fontWeight: 700, color: '#166534' }}>₹{o.total}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate('/buyer/orders')} style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 600 }}>📦 View Orders</button>
            <button onClick={() => navigate('/buyer/shop')} style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #22c55e33', cursor: 'pointer' }}>🛒 Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step Labels ──
  const stepLabels = ['Cart', 'Address', 'Summary', 'Payment'];

  return (
    <div className="dashboard-section" style={{ paddingBottom: '0' }}>
      
      {/* Back Button */}
      {checkoutStep > 1 && (
        <button onClick={() => setCheckoutStep(checkoutStep - 1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#166534', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: '4px 0', marginBottom: '8px', fontFamily: 'Poppins, sans-serif' }}>
          <FiArrowLeft size={18} /> Back
        </button>
      )}

      {/* ── STEP PROGRESS BAR ── */}
      {cartItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0 18px', gap: '0' }}>
          {stepLabels.map((label, i) => {
            const sn = i + 1; const isActive = checkoutStep === sn; const isDone = checkoutStep > sn;
            return (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '55px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    background: isDone ? '#22c55e' : isActive ? '#166534' : '#e5e7eb',
                    color: isDone || isActive ? '#fff' : '#9ca3af', transition: 'all 0.3s',
                    cursor: isDone ? 'pointer' : 'default',
                  }} onClick={() => isDone && setCheckoutStep(sn)}>
                    {isDone ? <FiCheck size={15} /> : sn}
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#166534' : isDone ? '#22c55e' : '#9ca3af', textAlign: 'center' }}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div style={{ flex: 1, height: '2px', maxWidth: '40px', background: checkoutStep > sn ? '#22c55e' : '#e5e7eb', margin: '0 2px', marginBottom: '20px', transition: 'background 0.3s' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <FiShoppingCart size={48} /><h3>Your cart is empty</h3><p>Browse products and add items to your cart</p>
          <button className="btn-primary" onClick={() => navigate('/buyer/shop')}>Browse Products</button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(22,163,74,0.08)', boxShadow: '0 2px 16px rgba(22,101,52,0.06)', overflow: 'hidden' }}>

          {/* === STEP 1: CART === */}
          {checkoutStep === 1 && (<>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, color: '#14532d', fontSize: '1rem' }}>🛒 Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#166534', fontWeight: 600, userSelect: 'none' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                  style={{ width: '17px', height: '17px', accentColor: '#166534', cursor: 'pointer' }} />
                {allSelected ? 'Deselect All' : 'Select All'}
              </label>
            </div>
            {cartItems.map((item, idx) => {
              const qty = Math.floor(item.quantity) || 1;
              const isSelected = selectedItems.has(item.id);
              return (
                <div key={item.id} style={{ padding: '14px 20px', borderBottom: idx < cartItems.length - 1 ? '1px solid #f5f5f5' : 'none', opacity: isSelected ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectItem(item.id)}
                      style={{ width: '18px', height: '18px', accentColor: '#166534', cursor: 'pointer', marginTop: '28px', flexShrink: 0 }} />
                    <SmartProductImage product={item} alt={item.name || item.product_name}
                      style={{ width: '75px', height: '75px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 3px', fontSize: '0.92rem', color: '#1f2937', fontWeight: 600 }}>{item.name || item.product_name}</h4>
                      <p style={{ margin: '0 0 3px', fontSize: '0.75rem', color: '#6b7280' }}>{item.farmer_name || 'Local Farmer'}{item.category ? ` • ${item.category}` : ''}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#14532d' }}>₹{(item.price * qty).toFixed(0)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>₹{item.price}/{item.unit || 'kg'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#22c55e', fontWeight: 500 }}>
                        <FiTruck size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                        Delivery by {deliveryDateStr}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <button onClick={() => handleUpdateQuantity(item.id, qty - 1)} disabled={qty <= 1}
                        style={{ width: '34px', height: '34px', border: 'none', background: qty <= 1 ? '#f9fafb' : '#fff', cursor: qty <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: qty <= 1 ? '#d1d5db' : '#166534', fontSize: '1.1rem', fontWeight: 700 }}>−</button>
                      <span style={{ width: '40px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1.5px solid #e5e7eb', borderRight: '1.5px solid #e5e7eb', fontWeight: 700, fontSize: '0.9rem', color: '#14532d', background: '#f0fdf4' }}>{qty}</span>
                      <button onClick={() => handleUpdateQuantity(item.id, qty + 1)}
                        style={{ width: '34px', height: '34px', border: 'none', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontSize: '1.1rem', fontWeight: 700 }}>+</button>
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #fecaca', borderRadius: '8px', padding: '7px 12px', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                      <FiTrash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {total < freeThreshold && (
              <div style={{ padding: '10px 20px', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}>
                🚚 Add ₹{(freeThreshold - total).toFixed(0)} more for <b>FREE delivery</b>
              </div>
            )}
            {/* Sticky Bottom */}
            <div style={{ position: 'sticky', bottom: '0', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>{selectedItems.size} of {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} selected</div>
                {total > 0 && <div style={{ fontSize: '0.65rem', color: '#9ca3af', textDecoration: 'line-through' }}>₹{(total * 1.15).toFixed(0)}</div>}
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>₹{grandTotal.toFixed(0)}</div>
              </div>
              <button onClick={() => { if (selectedItems.size === 0) { toast.error('Select at least one item'); return; } setCheckoutStep(2); }}
                disabled={selectedItems.size === 0}
                style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 700, background: selectedItems.size === 0 ? '#9ca3af' : 'linear-gradient(135deg, #166534, #22c55e)', color: '#fff', border: 'none', fontSize: '0.95rem', cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: selectedItems.size === 0 ? 'none' : '0 4px 15px rgba(22,101,52,0.3)' }}>
                Continue <FiChevronRight size={16} />
              </button>
            </div>
          </>)}

          {/* = = =  STEP 2: ADDRESS = = =  */}
          {checkoutStep === 2 && (() => {
            const fullAddress = [houseNumber, street, city, addrState, pincode].filter(Boolean).join(', ');
            const isAddressValid = houseNumber.trim() && pincode.trim() && /^[0-9]{6}$/.test(pincode.trim());
            const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1.5px solid rgba(22,163,74,0.2)', fontFamily: 'Poppins, sans-serif', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };
            const labelStyle = { display: 'block', marginBottom: '5px', color: '#14532d', fontWeight: 600, fontSize: '0.8rem' };
            const requiredStar = <span style={{ color: '#dc2626' }}> *</span>;
            return (<>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, color: '#14532d', fontSize: '1rem' }}>📍 Delivery Address</h3>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {/* Deliver To Preview Card */}
              {fullAddress && (
                <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px 14px', border: '1.5px solid #22c55e', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#14532d', fontSize: '0.9rem' }}>Deliver to:</span>
                    <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.58rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>HOME</span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#1f2937', fontSize: '0.88rem' }}>{userName}</p>
                  <p style={{ margin: '0 0 2px', color: '#4b5563', fontSize: '0.8rem', lineHeight: 1.4 }}>{fullAddress}</p>
                  {userPhone && <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>📞 {userPhone}</p>}
                </div>
              )}

              {/* House Number */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>House / Flat / Building No.{requiredStar}</label>
                <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="e.g. 28-5-339, Flat 201"
                  style={{ ...inputStyle, borderColor: !houseNumber.trim() && checkoutStep === 2 ? 'rgba(220,38,38,0.4)' : 'rgba(22,163,74,0.2)' }} />
                {!houseNumber.trim() && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#dc2626' }}>House number is required</p>}
              </div>

              {/* Street / Colony */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Street / Colony / Area</label>
                <input value={street} onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Reddy Puram bypass road, Vijaya Laxmi Colony"
                  style={inputStyle} />
              </div>

              {/* City + State Row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Hanamkonda"
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>State</label>
                  <input value={addrState} onChange={(e) => setAddrState(e.target.value)}
                    placeholder="e.g. Telangana"
                    style={inputStyle} />
                </div>
              </div>

              {/* Pincode */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Pincode{requiredStar}</label>
                <input value={pincode} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPincode(v); }}
                  placeholder="6-digit pincode (e.g. 506001)"
                  inputMode="numeric" maxLength={6}
                  style={{ ...inputStyle, width: '180px', letterSpacing: '2px', fontWeight: 600, borderColor: pincode && !/^[0-9]{6}$/.test(pincode) ? 'rgba(220,38,38,0.4)' : 'rgba(22,163,74,0.2)' }} />
                {pincode && !/^[0-9]{6}$/.test(pincode) && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#dc2626' }}>Enter a valid 6-digit pincode</p>}
                {!pincode && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#dc2626' }}>Pincode is required</p>}
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Delivery Notes (optional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Landmark, special instructions..."
                  style={inputStyle} />
              </div>
            </div>

            {/* Sticky Bottom */}
            <div style={{ position: 'sticky', bottom: '0', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
              <div><div style={{ fontSize: '0.7rem', color: '#9ca3af', textDecoration: 'line-through' }}>₹{(total * 1.15).toFixed(0)}</div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>₹{grandTotal.toFixed(0)}</div></div>
              <button onClick={() => {
                  if (!houseNumber.trim()) { toast.error('Please enter house number'); return; }
                  if (!pincode.trim() || !/^[0-9]{6}$/.test(pincode.trim())) { toast.error('Please enter valid 6-digit pincode'); return; }
                  setCheckoutStep(3);
                }}
                disabled={!(houseNumber.trim() && pincode.trim() && /^[0-9]{6}$/.test(pincode.trim()))}
                style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 700, background: !(houseNumber.trim() && pincode.trim() && /^[0-9]{6}$/.test(pincode.trim())) ? '#9ca3af' : 'linear-gradient(135deg, #166534, #22c55e)', color: '#fff', border: 'none', fontSize: '0.95rem', cursor: !(houseNumber.trim() && pincode.trim() && /^[0-9]{6}$/.test(pincode.trim())) ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: !(houseNumber.trim() && pincode.trim() && /^[0-9]{6}$/.test(pincode.trim())) ? 'none' : '0 4px 15px rgba(22,101,52,0.3)' }}>
                Continue <FiChevronRight size={16} />
              </button>
            </div>
          </>); })()}

          {/* = = =  STEP 3: ORDER SUMMARY = = =  */}
          {checkoutStep === 3 && (<>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, color: '#14532d', fontSize: '1rem' }}>📋 Order Summary</h3>
            </div>
            <div style={{ padding: '14px 20px' }}>
              {/* Deliver To Mini */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>Deliver to</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{userName} — {deliveryAddress.length > 35 ? deliveryAddress.substring(0, 35) + '...' : deliveryAddress}</p>
                </div>
                <button onClick={() => setCheckoutStep(2)} style={{ background: 'none', border: '1px solid #166534', borderRadius: '8px', color: '#166534', padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Change</button>
              </div>

              {/* Items */}
              {cartItems.map((item, idx) => {
                const qty = Math.floor(item.quantity) || 1;
                return (
                  <div key={item.id} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: idx < cartItems.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <SmartProductImage product={item} alt={item.name || item.product_name} style={{ width: '55px', height: '55px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #f0f0f0' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.85rem', color: '#1f2937' }}>{item.name || item.product_name}</p>
                      <p style={{ margin: '0 0 3px', fontSize: '0.75rem', color: '#6b7280' }}>Qty: {qty} × ₹{item.price}/{item.unit || 'kg'}</p>
                      <p style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.92rem' }}>₹{(item.price * qty).toFixed(0)}</p>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 0', borderTop: '1px solid #f0f0f0', color: '#166534', fontSize: '0.82rem', fontWeight: 500 }}>
                <FiTruck size={14} /> Delivery by <b>{deliveryDateStr}</b>
                {total >= freeThreshold && <span style={{ color: '#22c55e', fontWeight: 600, marginLeft: '4px' }}>| FREE</span>}
              </div>
            </div>

            {/* Price Details */}
            <div style={{ padding: '14px 20px', borderTop: '6px solid #f5f5f5' }}>
              <h4 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: '0.92rem', fontWeight: 700 }}>Price Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563' }}>
                  <span>Price ({cartItems.length} item{cartItems.length > 1 ? 's' : ''})</span><span>₹{total.toFixed(0)}</span>
                </div>
                {platformSettings.gstPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563' }}>
                    <span>GST ({platformSettings.gstPercent}%)</span><span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                )}
                {platformSettings.platformPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563' }}>
                    <span>Platform Fee ({platformSettings.platformPercent}%)</span><span>₹{platformFeeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4b5563' }}>
                  <span>Delivery Charges</span>
                  <span style={{ color: total >= freeThreshold ? '#22c55e' : '#4b5563', fontWeight: total >= freeThreshold ? 600 : 400 }}>{total >= freeThreshold ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#14532d' }}>
                  <span>Total Amount</span><span>₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '0.82rem', fontWeight: 600, color: '#166534' }}>
                🎉 You'll save <b>₹{deliveryFee === 0 ? String(platformSettings.deliveryFlat || 30) : '0'}</b> on delivery{total >= freeThreshold ? '!' : ' when you add more items!'}
              </div>
            </div>

            <div style={{ position: 'sticky', bottom: '0', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
              <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>₹{grandTotal.toFixed(0)}</div></div>
              <button onClick={() => setCheckoutStep(4)}
                style={{ padding: '12px 32px', borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #166534, #22c55e)', color: '#fff', border: 'none', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 15px rgba(22,101,52,0.3)' }}>
                Continue <FiChevronRight size={16} />
              </button>
            </div>
          </>)}

          {/* === STEP 4: PAYMENT === */}
          {checkoutStep === 4 && (<>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#14532d', fontSize: '1rem' }}>💳 Payment</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '0.72rem' }}><FiShield size={12} color="#22c55e" /> 100% Secure</div>
            </div>

            {/* Total Bar */}
            <div style={{ padding: '10px 20px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dcfce7' }}>
              <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.88rem' }}>Total Amount</span>
              <span style={{ color: '#14532d', fontWeight: 800, fontSize: '1.1rem' }}>₹{grandTotal.toFixed(0)}</span>
            </div>

            <div style={{ padding: '14px 20px' }}>
              {/* Recommended */}
              <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '12px 14px', border: '1px solid #fde68a', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>✨ Recommended for You</p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#78716c' }}>Cash on Delivery — Pay when your fresh produce arrives!</p>
              </div>

              {/* UPI / Online */}
              <div onClick={() => setPaymentMethod('online')}
                style={{ padding: '14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: paymentMethod === 'online' ? '#f0fdf4' : '#fff', transition: 'all 0.2s', borderRadius: paymentMethod === 'online' ? '10px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'online' ? '5px solid #22c55e' : '2px solid #d1d5db', transition: 'all 0.2s' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>💳 UPI / Card / Net Banking</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#22c55e', fontWeight: 500 }}>Pay securely online via Razorpay</p>
                  </div>
                </div>
              </div>

              {/* COD */}
              <div onClick={() => setPaymentMethod('cod')}
                style={{ padding: '14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: paymentMethod === 'cod' ? '#f0fdf4' : '#fff', transition: 'all 0.2s', borderRadius: paymentMethod === 'cod' ? '10px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: paymentMethod === 'cod' ? '5px solid #22c55e' : '2px solid #d1d5db', transition: 'all 0.2s' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>💰 Cash on Delivery</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#6b7280' }}>Pay when you receive your order</p>
                  </div>
                </div>
              </div>

              {/* Security Badges */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '18px', padding: '10px 0', borderTop: '1px solid #f0f0f0' }}>
                {[{icon: <FiShield size={18} color="#22c55e" />, t: 'Safe & Secure'}, {icon: <FiTruck size={18} color="#22c55e" />, t: 'Fast Delivery'}, {icon: <FiCheck size={18} color="#22c55e" />, t: 'Farm Fresh'}].map((b,i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af' }}>
                    <div style={{ marginBottom: '3px', display: 'flex', justifyContent: 'center' }}>{b.icon}</div>{b.t}
                  </div>
                ))}
              </div>
            </div>

            {/* Place Order */}
            <div style={{ position: 'sticky', bottom: '0', background: '#fff', borderTop: '1px solid #e5e7eb', padding: '14px 20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
              <button onClick={handlePlaceOrder} disabled={placing}
                style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 700, background: placing ? '#9ca3af' : 'linear-gradient(135deg, #166534, #15803d, #22c55e)', color: '#fff', border: 'none', fontSize: '1rem', cursor: placing ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: placing ? 'none' : '0 6px 20px rgba(22,101,52,0.35)', transition: 'all 0.3s' }}>
                {placing ? '⏳ Placing Order...' : `Place Order - ₹${grandTotal.toFixed(0)}`}
              </button>
              <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af', lineHeight: 1.4 }}>
                By placing this order, you agree to SmartFarm's Terms of Use and Privacy Policy
              </p>
            </div>
          </>)}

        </div>
      )}
    </div>
  );
};

// ============================================================================
// BuyerOrders – Full Order Lifecycle with Tracking, Reviews, Returns
// ============================================================================

const ORDER_STEPS = [
  { key: 'pending', label: 'Placed', icon: '📋' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'packed', label: 'Packed', icon: '📦' },
  { key: 'dispatched', label: 'Dispatched', icon: '🚚' },
  { key: 'in_transit', label: 'In Transit', icon: '🚛' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

const BuyerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [showReview, setShowReview] = useState(null);
  const [showReturn, setShowReturn] = useState(null);
  const [reviewData, setReviewData] = useState({
    product_rating: 5, product_review: '', farmer_rating: 5, farmer_review: '',
  });
  const [returnReason, setReturnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await buyerAPI.getOrders();
      const data = response.data;
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (orderId) => {
    try {
      const [trackRes, detailRes] = await Promise.all([
        buyerAPI.getOrderTracking(orderId),
        buyerAPI.getOrderDetail(orderId),
      ]);
      const trackData = trackRes.data;
      const detailData = detailRes.data?.order || detailRes.data || {};
      setTracking({ ...trackData, orderDetail: detailData });
      setSelectedOrder(orderId);
    } catch (error) {
      toast.error('Failed to load tracking');
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = window.prompt('Reason for cancellation:');
    if (reason === null) return;
    try {
      await buyerAPI.cancelOrder(orderId, reason);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await buyerAPI.submitReview(showReview, reviewData);
      toast.success('Review submitted! Thank you!');
      setShowReview(null);
      setReviewData({ product_rating: 5, product_review: '', farmer_rating: 5, farmer_review: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) { toast.error('Please enter a reason'); return; }
    setSubmitting(true);
    try {
      await buyerAPI.requestReturn(showReturn, { reason: returnReason });
      toast.success('Return request submitted');
      setShowReturn(null);
      setReturnReason('');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b', confirmed: '#3b82f6', processing: '#8b5cf6',
      packed: '#6366f1', dispatched: '#0ea5e9', in_transit: '#14b8a6',
      out_for_delivery: '#f97316', delivered: '#22c55e', cancelled: '#ef4444',
      return_requested: '#dc2626',
    };
    return colors[status] || '#6b7280';
  };

  const getStepIndex = (status) => ORDER_STEPS.findIndex(s => s.key === status);

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section">
      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={48} />
          <h3>No orders yet</h3>
          <p>Your orders will appear here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => {
            const currentStep = getStepIndex(order.status);
            const isCancelled = order.status === 'cancelled';
            const isDelivered = order.status === 'delivered';
            const isReturned = order.status === 'return_requested';
            const isConfirmed = ['confirmed', 'processing', 'packed', 'dispatched', 'in_transit', 'out_for_delivery'].includes(order.status);
            
            return (
              <div key={order.id} style={{
                background: 'rgba(255,255,255,0.97)', borderRadius: '16px',
                border: '1px solid rgba(22,163,74,0.08)', overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(22,101,52,0.06)',
              }}>
                {/* Order Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                  borderBottom: '1px solid rgba(22,163,74,0.06)',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#14532d', fontSize: '0.95rem' }}>
                      Order #{order.order_number || order.id}
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#888' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isConfirmed && (
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem',
                        fontWeight: 700, background: '#dcfce7', color: '#166534',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        animation: 'pulse 2s infinite',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                        LIVE
                      </span>
                    )}
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      background: getStatusColor(order.status) + '20',
                      color: getStatusColor(order.status),
                    }}>
                      {(order.status || 'pending').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Order Body */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
                        {order.product_name || 'Product'}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '0.82rem', color: '#6b7280' }}>
                        Qty: {order.quantity} {order.farmer_name ? `from ${order.farmer_name}` : ''} {order.payment_method === 'cod' ? 'COD' : 'Online'}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#166534' }}>
                      Rs.{order.total_amount || order.total || 0}
                    </p>
                  </div>

                  {/* Mini Progress Stepper (for active orders) */}
                  {!isCancelled && !isReturned && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '2px',
                      background: '#f8fdf9', borderRadius: '10px', padding: '10px 8px', marginBottom: '12px',
                    }}>
                      {ORDER_STEPS.map((step, i) => {
                        const isCompleted = i <= currentStep;
                        const isCurrent = i === currentStep;
                        return (
                          <React.Fragment key={step.key}>
                            <div style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              flex: 1, minWidth: 0,
                            }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem',
                                background: isCompleted ? '#22c55e' : '#e5e7eb',
                                color: isCompleted ? '#fff' : '#9ca3af',
                                boxShadow: isCurrent ? '0 0 0 3px #22c55e40' : 'none',
                                transition: 'all 0.3s',
                              }}>
                                {isCompleted ? step.icon : (i + 1)}
                              </div>
                              <span style={{
                                fontSize: '0.55rem', color: isCompleted ? '#166534' : '#9ca3af',
                                marginTop: '3px', fontWeight: isCurrent ? 700 : 500,
                                textAlign: 'center', lineHeight: 1.1,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                maxWidth: '50px',
                              }}>
                                {step.label}
                              </span>
                            </div>
                            {i < ORDER_STEPS.length - 1 && (
                              <div style={{
                                height: '2px', flex: '0 0 8px',
                                background: i < currentStep ? '#22c55e' : '#e5e7eb',
                                borderRadius: '1px', marginTop: '-12px',
                              }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Cancelled Banner */}
                  {isCancelled && (
                    <div style={{
                      background: '#fef2f2', borderRadius: '8px', padding: '10px 14px',
                      marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                        This order has been cancelled
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!isCancelled && (
                      <button onClick={() => handleTrackOrder(order.id)} style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                        background: '#f0fdf4', color: '#166534', border: '1px solid #22c55e33',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        Track Order
                      </button>
                    )}
                    
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button onClick={() => handleCancelOrder(order.id)} style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                        background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a533',
                        cursor: 'pointer',
                      }}>
                        Cancel
                      </button>
                    )}
                    
                    {isDelivered && (
                      <>
                        <button onClick={() => setShowReview(order.id)} style={{
                          padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                          background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#fff',
                          border: 'none', cursor: 'pointer',
                        }}>
                          Rate & Review
                        </button>
                        <button onClick={() => setShowReturn(order.id)} style={{
                          padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                          background: '#fff7ed', color: '#c2410c', border: '1px solid #fb923c33',
                          cursor: 'pointer',
                        }}>
                          Return
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tracking Modal ── */}
      {selectedOrder && tracking && (() => {
        const detail = tracking.orderDetail || {};
        const farmer = detail.farmer || {};
        const isActive = ['confirmed', 'processing', 'packed', 'dispatched', 'in_transit', 'out_for_delivery'].includes(detail.status);
        return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
        }} onClick={() => { setSelectedOrder(null); setTracking(null); }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '500px',
            width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Order Tracking
              {isActive && (
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700, background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                  LIVE
                </span>
              )}
            </h3>

            {/* Farmer Info Card - shows when order is confirmed/active */}
            {farmer.name && isActive && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: '14px',
                padding: '14px 16px', marginBottom: '18px', border: '1px solid #bbf7d0',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Farmer Details</p>
                <p style={{ margin: '0 0 4px', fontSize: '0.92rem', fontWeight: 700, color: '#14532d' }}>{farmer.name}</p>
                {farmer.location && <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280' }}>Location: {farmer.location}</p>}
                {farmer.phone && <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#6b7280' }}>Phone: {farmer.phone}</p>}
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(farmer.navigate_to_farmer_url || farmer.directions_url) && (
                    <a href={farmer.navigate_to_farmer_url || farmer.directions_url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
                      background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff',
                      textDecoration: 'none', boxShadow: '0 2px 8px rgba(29,78,216,0.3)',
                    }}>
                      <FiMapPin size={14} /> Navigate to Farmer
                    </a>
                  )}
                  {farmer.phone && (
                    <a href={`tel:${farmer.phone}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700,
                      background: '#166534', color: '#fff', textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(22,101,52,0.3)',
                    }}>
                      <FiPhone size={14} /> Call Farmer
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {(tracking.timeline || []).map((step, i) => (
                <div key={step.status} style={{ display: 'flex', gap: '16px' }}>
                  {/* Timeline Line & Dot */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0,
                      background: step.completed ? '#22c55e' : '#f1f5f9',
                      color: step.completed ? '#fff' : '#9ca3af',
                      boxShadow: step.current ? '0 0 0 4px #22c55e40' : 'none',
                    }}>
                      {step.icon}
                    </div>
                    {i < (tracking.timeline || []).length - 1 && (
                      <div style={{
                        width: '2px', height: '36px',
                        background: step.completed ? '#22c55e' : '#e5e7eb',
                      }} />
                    )}
                  </div>
                  
                  {/* Step Content */}
                  <div style={{ paddingBottom: '16px', flex: 1 }}>
                    <p style={{
                      margin: 0, fontWeight: step.current ? 700 : 500,
                      color: step.completed ? '#14532d' : '#9ca3af', fontSize: '0.92rem',
                    }}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(step.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                    {step.description && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#888' }}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={() => { setSelectedOrder(null); setTracking(null); }} style={{
              width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 600,
              background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer',
              marginTop: '8px', fontFamily: 'Poppins, sans-serif',
            }}>
              Close
            </button>
          </div>
        </div>
        );
      })()}

      {/* ── Review Modal ── */}
      {showReview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
        }} onClick={() => setShowReview(null)}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '450px',
            width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: '#14532d' }}>⭐ Rate & Review</h3>
            
            {/* Product Rating */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#14532d', fontSize: '0.9rem' }}>
                Product Rating
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReviewData(d => ({ ...d, product_rating: star }))}
                    style={{
                      fontSize: '1.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                      filter: star <= reviewData.product_rating ? 'none' : 'grayscale(1) opacity(0.3)',
                    }}>
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={reviewData.product_review}
                onChange={(e) => setReviewData(d => ({ ...d, product_review: e.target.value }))}
                placeholder="Write about the product quality..."
                rows={2}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
                  fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Farmer Rating */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#14532d', fontSize: '0.9rem' }}>
                Farmer Rating
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReviewData(d => ({ ...d, farmer_rating: star }))}
                    style={{
                      fontSize: '1.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                      filter: star <= reviewData.farmer_rating ? 'none' : 'grayscale(1) opacity(0.3)',
                    }}>
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={reviewData.farmer_review}
                onChange={(e) => setReviewData(d => ({ ...d, farmer_review: e.target.value }))}
                placeholder="Write about the farmer service..."
                rows={2}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
                  fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowReview(null)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600,
                background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}>
                Cancel
              </button>
              <button onClick={handleSubmitReview} disabled={submitting} style={{
                flex: 2, padding: '12px', borderRadius: '10px', fontWeight: 700,
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}>
                {submitting ? 'Submitting...' : '⭐ Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ── */}
      {showReturn && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '20px',
        }} onClick={() => setShowReturn(null)}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px', maxWidth: '450px',
            width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: '#c2410c' }}>🔄 Request Return</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#14532d', fontSize: '0.9rem' }}>
                Reason for Return *
              </label>
              <select
                value={returnReason.split(':')[0] || ''}
                onChange={(e) => setReturnReason(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid #e5e7eb', fontSize: '0.9rem', outline: 'none',
                  fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box', marginBottom: '12px',
                }}
              >
                <option value="">Select reason...</option>
                <option value="Damaged product">Damaged product</option>
                <option value="Wrong item received">Wrong item received</option>
                <option value="Quality issue">Quality issue</option>
                <option value="Not as described">Not as described</option>
                <option value="Other">Other</option>
              </select>
              
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '0.85rem', outline: 'none',
                  fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowReturn(null)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600,
                background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}>
                Cancel
              </button>
              <button onClick={handleSubmitReturn} disabled={submitting} style={{
                flex: 2, padding: '12px', borderRadius: '10px', fontWeight: 700,
                background: submitting ? '#9ca3af' : '#c2410c',
                color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif',
              }}>
                {submitting ? 'Submitting...' : '🔄 Submit Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Purchase History with Receipt Download ─────────────────────────────
const PurchaseHistory = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await paymentsAPI.getPurchaseHistory();
      const data = res.data;
      setReceipts(Array.isArray(data) ? data : data.receipts || []);
    } catch (e) {
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = async (receiptId) => {
    try {
      const res = await paymentsAPI.getReceipt(receiptId);
      setSelectedReceipt(res.data.receipt || res.data);
    } catch (e) {
      toast.error('Failed to load receipt');
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section">
      <h2>🧾 Purchase History</h2>
      {receipts.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={48} />
          <h3>No purchases yet</h3>
          <p>Your purchase receipts will appear here</p>
        </div>
      ) : (
        <div className="orders-list">
          {receipts.map(r => (
            <div key={r.id || r.receipt_id} style={{
              background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '16px',
              marginBottom: '10px', border: '1px solid rgba(22,163,74,0.08)',
              boxShadow: '0 2px 8px rgba(22,101,52,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#14532d' }}>{r.receipt_id}</h4>
                  <p style={{ margin: '4px 0', fontSize: '0.82rem', color: '#888' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : ''}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>
                    {r.farmer_name && `From: ${r.farmer_name}`} • {r.payment_type?.toUpperCase()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>₹{r.grand_total}</p>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                    background: r.payment_status === 'completed' ? '#dcfce7' : '#fef3c7',
                    color: r.payment_status === 'completed' ? '#15803d' : '#d97706',
                  }}>{r.payment_status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => viewReceipt(r.receipt_id)} style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
                  borderRadius: '8px', border: '1px solid #16a34a', background: '#f0fdf4',
                  color: '#166534', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}><FiEye /> View Receipt</button>
                <button onClick={() => viewReceipt(r.receipt_id)} style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
                  borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#166534,#22c55e)',
                  color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}><FiDownload /> Download</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <ReceiptViewer receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
};

// ─── BuyerProfile ────────────────────────────────────────────────────
const profileStyles = {
  container: {
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '16px',
    padding: '28px',
    border: '1px solid rgba(22,163,74,0.1)',
    boxShadow: '0 8px 32px rgba(22,163,74,0.10)',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 20px',
    color: '#14532d',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  fieldFull: {
    gridColumn: '1 / -1',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#14532d',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  input: {
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(22,163,74,0.15)',
    width: '100%',
    fontFamily: 'Poppins, sans-serif',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #166534, #22c55e)',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'Poppins, sans-serif',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
    gridColumn: '1 / -1',
  },
};

const BuyerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    location: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await buyerAPI.getProfile();
      const data = res.data?.profile || res.data;
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        email: data.email || '',
        location: data.location || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await buyerAPI.updateProfile(formData);
      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section">
      <h2>👤 My Profile</h2>
      <div style={profileStyles.container}>
        <h3 style={profileStyles.title}>Edit Profile Information</h3>
        <div style={profileStyles.grid}>
          <div>
            <label style={profileStyles.label}>First Name</label>
            <input
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First Name"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>Last Name</label>
            <input
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last Name"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address"
              style={profileStyles.input}
            />
          </div>
          <div style={profileStyles.fieldFull}>
            <label style={profileStyles.label}>Address / Location</label>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Street address or area"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>City</label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>State</label>
            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
              style={profileStyles.input}
            />
          </div>
          <div>
            <label style={profileStyles.label}>Pincode</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="6-digit pincode"
              style={profileStyles.input}
            />
          </div>

          {/* Info badges */}
          <div style={profileStyles.fieldFull}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
              {profile?.total_orders > 0 && (
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #22c55e33' }}>
                  📦 {profile.total_orders} Orders
                </span>
              )}
              {profile?.member_since && (
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #16653433' }}>
                  📅 Member since {new Date(profile.member_since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div style={profileStyles.btnRow}>
            <button style={profileStyles.saveBtn} onClick={handleSave} disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BuyerWishlist — Wishlist with product cards
// ============================================================================
const BuyerWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWishlist = async () => {
      const res = await buyerAPI.getWishlist();
      setWishlist(res.data || []);
      setLoading(false);
    };
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    await buyerAPI.removeFromWishlist(productId);
    setWishlist(prev => prev.filter(p => p.id !== productId));
    toast('Removed from wishlist', { icon: '💔' });
  };

  const handleAddToCart = async (product) => {
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    try {
      await buyerAPI.addToCart(product.id, 1);
      toast.success(`${product.name} added to cart!`, { icon: '🛒' });
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to add to cart';
      if (msg.includes('already')) {
        toast.success(`${product.name} is already in your cart!`, { icon: '✅' });
      } else {
        toast.error(msg);
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiHeart size={24} color="#ef4444" /> My Wishlist
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280', marginLeft: '4px' }}>
            ({wishlist.length} item{wishlist.length !== 1 ? 's' : ''})
          </span>
        </h2>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>💝</div>
          <h3 style={{ color: '#14532d', marginBottom: '8px' }}>Your wishlist is empty</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>Save products you love to buy them later</p>
          <button className="btn-primary" onClick={() => navigate('/buyer/shop')}>
            <FiShoppingCart size={16} /> Browse Products
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {wishlist.map(product => (
            <div key={product.id} className="product-card-buyer" style={{ position: 'relative' }}>
              <div className="product-image" style={{ position: 'relative' }}>
                <SmartProductImage product={product} alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => handleRemove(product.id)}
                  style={{
                    position: 'absolute', top: '8px', right: '8px', zIndex: 5,
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  }}>
                  <FiHeart size={16} fill="#ef4444" color="#ef4444" />
                </button>
                {product.organic && <span className="organic-badge">🌿 Organic</span>}
              </div>
              <div className="product-details">
                <h3>{product.name}</h3>
                <p className="farmer-name">
                  <FiMapPin size={12} /> {product.farmer_name || 'Local Farmer'}
                </p>
                <div className="product-meta">
                  <span className="category-tag">{product.category}</span>
                  {product.average_rating > 0 && (
                    <span className="rating"><FiStar size={12} /> {product.average_rating}</span>
                  )}
                </div>
                <div className="product-footer">
                  <div className="price-info">
                    <span className="price">₹{product.price}</span>
                    <span className="unit">/{product.unit || 'kg'}</span>
                  </div>
                  <button
                    className={`btn-add-cart ${addingToCart[product.id] ? 'adding' : ''}`}
                    onClick={() => handleAddToCart(product)}
                    disabled={addingToCart[product.id]}
                  >
                    {addingToCart[product.id] ? 'Adding...' : <><FiShoppingCart size={14} /> Add</>}
                  </button>
                </div>
              </div>
              {/* Wishlisted date */}
              <div style={{ padding: '6px 14px', background: '#fef2f2', borderTop: '1px solid #fecaca', fontSize: '0.7rem', color: '#9ca3af' }}>
                ❤️ Added {product.wishlisted_at ? new Date(product.wishlisted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BuyerChat — Chat with Farmers
// ============================================================================
const BUYER_SHARED_MSGS = 'sf_shared_messages';
const BUYER_SHARED_CONVS = 'sf_shared_conversations';
const ACTIVITY_KEY = 'sf_user_activity'; // tracks last-seen per user
const MSG_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean expired messages (>24h old) from localStorage
const cleanExpiredMessages = () => {
  try {
    const now = Date.now();
    const msgs = JSON.parse(localStorage.getItem(BUYER_SHARED_MSGS) || '[]');
    const valid = msgs.filter(m => now - new Date(m.created_at).getTime() < MSG_TTL_MS);
    if (valid.length !== msgs.length) {
      localStorage.setItem(BUYER_SHARED_MSGS, JSON.stringify(valid));
    }
    // Also clean stale conversations that have no messages left
    const convs = JSON.parse(localStorage.getItem(BUYER_SHARED_CONVS) || '[]');
    const activeConvIds = new Set(valid.map(m => m.conv_id));
    const activeConvs = convs.filter(c => activeConvIds.has(c.id) || (now - new Date(c.updated_at).getTime() < MSG_TTL_MS));
    if (activeConvs.length !== convs.length) {
      localStorage.setItem(BUYER_SHARED_CONVS, JSON.stringify(activeConvs));
    }
    return valid;
  } catch { return []; }
};

const getSharedMsgs = () => { try { return JSON.parse(localStorage.getItem(BUYER_SHARED_MSGS) || '[]'); } catch { return []; } };
const saveBuyerMsg = (msg) => { const msgs = getSharedMsgs(); msgs.push(msg); localStorage.setItem(BUYER_SHARED_MSGS, JSON.stringify(msgs)); };

// Track user activity (for online status)
const updateUserActivity = (userId) => {
  try {
    const activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');
    activity[userId] = Date.now();
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  } catch {}
};
const isUserOnline = (userId) => {
  try {
    const activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');
    return Date.now() - (activity[userId] || 0) < 120000; // 2 min
  } catch { return false; }
};
const getTimeRemaining = (createdAt) => {
  const remaining = MSG_TTL_MS - (Date.now() - new Date(createdAt).getTime());
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / 3600000);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(remaining / 60000);
  return `${mins}m`;
};

const BuyerChat = () => {
  const [farmers, setFarmers] = useState([]);
  const [filteredFarmers, setFilteredFarmers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('farmers'); // 'farmers' | 'recent'
  const [recentChats, setRecentChats] = useState([]);
  const messagesEndRef = useRef(null);

  // Load user from auth store
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const currentUserId = currentUser?.id || currentUser?._id || 'buyer_me';
  const currentUserName = currentUser?.name || currentUser?.first_name || 'Buyer';

  // Fetch all farmers
  useEffect(() => {
    // Clean expired messages on mount
    cleanExpiredMessages();
    // Track buyer activity
    updateUserActivity(currentUserId);
    const activityInterval = setInterval(() => updateUserActivity(currentUserId), 30000);

    const fetchFarmers = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getUsers();
        const data = res.data || {};
        let farmerList = data.farmers || data.data?.farmers || [];
        if (!Array.isArray(farmerList)) farmerList = [];
        // Normalize farmer objects
        const normalized = farmerList.map((f, i) => ({
          id: f._id || f.id || `farmer_${i}`,
          name: f.name || f.first_name || `Farmer ${i + 1}`,
          email: f.email || '',
          phone: f.phone || '',
          location: f.location || f.city || f.district || '',
          avatar: f.avatar || null,
          productsCount: f.products_count || f.totalProducts || 0,
          rating: f.rating || 4.5,
          verified: f.verified !== false,
          joinedAt: f.created_at || f.createdAt || new Date().toISOString(),
        }));
        // ★ DEDUP: Remove duplicate farmers by id
        const seen = new Map();
        normalized.forEach(f => { if (!seen.has(String(f.id))) seen.set(String(f.id), f); });
        const unique = Array.from(seen.values());
        setFarmers(unique);
        setFilteredFarmers(unique);
      } catch {
        // Fallback demo farmers
        const demo = [
          { id: 'farmer_1', name: 'Ravi Kumar', email: 'ravi@farm.com', location: 'Hyderabad', productsCount: 12, rating: 4.8, verified: true },
          { id: 'farmer_2', name: 'Lakshmi Devi', email: 'lakshmi@farm.com', location: 'Warangal', productsCount: 8, rating: 4.6, verified: true },
          { id: 'farmer_3', name: 'Green Valley Dairy', email: 'greenvalley@farm.com', location: 'Karimnagar', productsCount: 5, rating: 4.9, verified: true },
        ];
        setFarmers(demo);
        setFilteredFarmers(demo);
      }
      setLoading(false);
    };
    fetchFarmers();
    loadRecentChats();

    // ★ Cross-tab instant sync: listen for localStorage changes
    const handleStorageChange = (e) => {
      if (e.key === BUYER_SHARED_MSGS && selectedFarmerRef.current) {
        const convId = getConvId(selectedFarmerRef.current.id);
        const allMsgs = getSharedMsgs().filter(m => m.conv_id === convId);
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newMsgs = allMsgs.filter(m => !ids.has(m.id));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Ref to track selectedFarmer for storage event listener
  const selectedFarmerRef = useRef(null);
  useEffect(() => { selectedFarmerRef.current = selectedFarmer; }, [selectedFarmer]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredFarmers(farmers); return; }
    const q = searchQuery.toLowerCase();
    setFilteredFarmers(farmers.filter(f =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q)
    ));
  }, [searchQuery, farmers]);

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ★ Fast polling for live feel (1.5s) + auto-clean expired
  useEffect(() => {
    if (!selectedFarmer) return;
    const convId = getConvId(selectedFarmer.id);
    const poll = setInterval(() => {
      // Filter out expired messages on each poll
      const now = Date.now();
      const allMsgs = getSharedMsgs().filter(m => m.conv_id === convId && (now - new Date(m.created_at).getTime() < MSG_TTL_MS));
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id));
        const newMsgs = allMsgs.filter(m => !ids.has(m.id));
        // Also remove expired from current view
        const validPrev = prev.filter(m => now - new Date(m.created_at).getTime() < MSG_TTL_MS);
        if (newMsgs.length > 0) return [...validPrev, ...newMsgs];
        if (validPrev.length !== prev.length) return validPrev;
        return prev;
      });
    }, 1500); // ★ 1.5s for real-time feel
    return () => clearInterval(poll);
  }, [selectedFarmer]);

  const getConvId = (farmerId) => `conv_${farmerId}_${currentUserId}`;

  const loadRecentChats = () => {
    try {
      const convs = JSON.parse(localStorage.getItem(BUYER_SHARED_CONVS) || '[]');
      const buyerConvs = convs.filter(c => c.buyer_id === currentUserId);
      setRecentChats(buyerConvs);
    } catch { setRecentChats([]); }
  };

  const selectFarmer = (farmer) => {
    setSelectedFarmer(farmer);
    const convId = getConvId(farmer.id);
    // Load messages for this conversation
    const allMsgs = getSharedMsgs().filter(m => m.conv_id === convId);
    if (allMsgs.length > 0) {
      allMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(allMsgs);
    } else {
      // Welcome message
      setMessages([{
        id: `welcome_${convId}`,
        content: `Hi! I'm ${farmer.name}. Welcome to my farm! How can I help you today? 🌱`,
        sender_id: farmer.id,
        sender_role: 'farmer',
        sender_name: farmer.name,
        created_at: new Date().toISOString(),
        conv_id: convId,
      }]);
    }
    // Save/update conversation in recent chats
    saveConversation(farmer, convId);
  };

  const saveConversation = (farmer, convId) => {
    try {
      const convs = JSON.parse(localStorage.getItem(BUYER_SHARED_CONVS) || '[]');
      const existing = convs.findIndex(c => c.id === convId);
      const convObj = {
        id: convId,
        buyer_id: currentUserId,
        buyer_name: currentUserName,
        farmer_id: farmer.id,
        farmer_name: farmer.name,
        other_user: { name: farmer.name, id: farmer.id },
        updated_at: new Date().toISOString(),
      };
      if (existing >= 0) { convs[existing] = { ...convs[existing], ...convObj }; }
      else { convs.push(convObj); }
      localStorage.setItem(BUYER_SHARED_CONVS, JSON.stringify(convs));
      loadRecentChats();
    } catch {}
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedFarmer) return;
    setSending(true);
    const convId = getConvId(selectedFarmer.id);
    const msg = {
      id: `buyer_msg_${Date.now()}`,
      content: newMessage,
      sender_id: currentUserId,
      sender_role: 'buyer',
      sender_name: currentUserName,
      created_at: new Date().toISOString(),
      conv_id: convId,
    };
    saveBuyerMsg(msg);
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    // Update conversation preview
    try {
      const convs = JSON.parse(localStorage.getItem(BUYER_SHARED_CONVS) || '[]');
      const idx = convs.findIndex(c => c.id === convId);
      if (idx >= 0) {
        convs[idx].last_message = newMessage;
        convs[idx].updated_at = new Date().toISOString();
        localStorage.setItem(BUYER_SHARED_CONVS, JSON.stringify(convs));
      }
    } catch {}
    // Also try API
    try { messagingAPI.sendMessage(convId, newMessage); } catch {}
    setSending(false);
  };

  const getInitials = (name) => (name || 'F').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const timeAgo = (ts) => { try { const d = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); return d < 1 ? 'Just now' : d < 60 ? `${d}m` : d < 1440 ? `${Math.floor(d/60)}h` : `${Math.floor(d/1440)}d`; } catch { return ''; } };

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section" style={{ padding: 0 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: selectedFarmer ? '1fr' : '1fr',
        height: 'calc(100vh - 120px)', background: '#fff', borderRadius: '16px',
        overflow: 'hidden', border: '1px solid rgba(22,163,74,0.08)',
        boxShadow: '0 4px 20px rgba(22,101,52,0.06)',
      }}>
        {/* Farmer List / Chat View */}
        {!selectedFarmer ? (
          <div style={{ overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0', background: 'linear-gradient(135deg, #f0fdf4, #fff)' }}>
              <h2 style={{ margin: 0, color: '#14532d', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMessageCircle size={22} /> Chat with Farmers
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                {farmers.length} farmer{farmers.length !== 1 ? 's' : ''} available to chat
              </p>
            </div>

            {/* Tabs: All Farmers / Recent Chats */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
              {[{ key: 'farmers', label: `👨‍🌾 All Farmers (${farmers.length})` }, { key: 'recent', label: `💬 Recent Chats (${recentChats.length})` }].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  flex: 1, padding: '10px 0', fontSize: '0.78rem', fontWeight: 600,
                  background: activeTab === t.key ? '#f0fdf4' : '#fff',
                  color: activeTab === t.key ? '#166534' : '#6b7280',
                  border: 'none', borderBottom: activeTab === t.key ? '2px solid #22c55e' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Poppins, sans-serif',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Search Bar */}
            {activeTab === 'farmers' && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 24, border: '1.5px solid rgba(22,163,74,0.15)', background: '#fafcfa' }}>
                  <FiSearch size={16} style={{ color: '#9ca3af' }} />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search farmers by name or location..."
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', background: 'transparent', fontFamily: 'Poppins, sans-serif' }}
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.9rem' }}>✕</button>}
                </div>
              </div>
            )}

            {/* Farmer List */}
            {activeTab === 'farmers' && (
              filteredFarmers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</p>
                  <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>{searchQuery ? 'No farmers match your search' : 'No farmers registered yet'}</p>
                </div>
              ) : (
                filteredFarmers.map(farmer => (
                  <div key={farmer.id} onClick={() => selectFarmer(farmer)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                      borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: 700, color: '#166534', flexShrink: 0,
                      border: farmer.verified ? '2px solid #22c55e' : '2px solid #e5e7eb',
                    }}>{getInitials(farmer.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.92rem' }}>{farmer.name}</p>
                        {farmer.verified && <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>✓ Verified</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        {farmer.location && <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}><FiMapPin size={10} />{farmer.location}</span>}
                        <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}>⭐ {farmer.rating}</span>
                        {farmer.productsCount > 0 && <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{farmer.productsCount} products</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <FiSend size={16} style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 600 }}>Chat</span>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Recent Chats Tab */}
            {activeTab === 'recent' && (
              recentChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>💬</p>
                  <p style={{ fontSize: '0.88rem', fontWeight: 500 }}>No recent chats</p>
                  <p style={{ fontSize: '0.75rem' }}>Start a conversation with any farmer from the list!</p>
                </div>
              ) : (
                recentChats.map(conv => (
                  <div key={conv.id} onClick={() => {
                    const farmer = farmers.find(f => f.id === conv.farmer_id) || { id: conv.farmer_id, name: conv.farmer_name, verified: true, rating: 4.5 };
                    selectFarmer(farmer);
                  }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                      borderBottom: '1px solid #f5f5f5', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: 700, color: '#166534', flexShrink: 0,
                    }}>{getInitials(conv.farmer_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.92rem' }}>{conv.farmer_name}</p>
                        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{timeAgo(conv.updated_at)}</span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message || 'Start chatting...'}
                      </p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        ) : (
          /* ═══ CHAT THREAD ═══ */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Chat Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'linear-gradient(135deg, #f0fdf4, #fff)',
            }}>
              <button onClick={() => { setSelectedFarmer(null); loadRecentChats(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', padding: '4px' }}>
                <FiArrowLeft size={20} />
              </button>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: '#166534',
              }}>{getInitials(selectedFarmer.name)}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.95rem' }}>{selectedFarmer.name}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: isUserOnline(selectedFarmer.id) ? '#22c55e' : '#9ca3af', fontWeight: 500 }}>
                  {isUserOnline(selectedFarmer.id) ? '● Online' : '○ Offline'}
                </p>
              </div>
              {selectedFarmer.location && (
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}><FiMapPin size={11} />{selectedFarmer.location}</span>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#fafcfa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(msg => {
                const isMine = msg.sender_role === 'buyer' || msg.sender === 'buyer';
                return (
                  <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMine ? 'linear-gradient(135deg, #166534, #22c55e)' : '#fff',
                      color: isMine ? '#fff' : '#1f2937',
                      fontSize: '0.88rem', lineHeight: 1.5,
                      boxShadow: isMine ? '0 2px 8px rgba(22,101,52,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                      border: isMine ? 'none' : '1px solid #f0f0f0',
                    }}>
                      {msg.content || msg.message}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: '#9ca3af' }}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                      {getTimeRemaining(msg.created_at) && (
                        <span style={{ margin: '3px 0 0', fontSize: '0.55rem', color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>
                          ⏳ {getTimeRemaining(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff',
              display: 'flex', gap: '10px', alignItems: 'center',
            }}>
              <input
                type="text" value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Message ${selectedFarmer.name}...`}
                style={{
                  flex: 1, padding: '11px 16px', borderRadius: '24px',
                  border: '1.5px solid rgba(22,163,74,0.2)', outline: 'none',
                  fontSize: '0.88rem', fontFamily: 'Poppins, sans-serif',
                }}
              />
              <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: newMessage.trim() ? 'linear-gradient(135deg, #166534, #22c55e)' : '#e5e7eb',
                  border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', transition: 'all 0.3s',
                  boxShadow: newMessage.trim() ? '0 2px 8px rgba(22,101,52,0.3)' : 'none',
                }}>
                <FiSend size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BuyerNotifications — Notification Center
// ============================================================================
const BuyerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminNotifs = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('sf_notifications_buyers') || '[]');
      return stored.filter(n => !n.dismissed).map(n => ({
        id: `admin_${n.id}`,
        type: 'admin',
        title: '📢 Admin Announcement',
        message: n.message,
        icon: '📢',
        read: n.read || false,
        created_at: n.timestamp,
        isAdmin: true,
      }));
    } catch { return []; }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      let apiNotifs = [];
      try {
        const res = await buyerAPI.getNotifications();
        apiNotifs = res.data || [];
      } catch {}
      // Add sample notifications if no API data
      if (apiNotifs.length === 0) {
        apiNotifs = [
          { id: '1', type: 'price_drop', title: '🔥 Price Drop Alert!', message: 'Organic Tomatoes price dropped by 20%! Was ₹60, now ₹48/kg', icon: '📉', read: false, created_at: new Date().toISOString() },
          { id: '2', type: 'order', title: '📦 Order Shipped', message: 'Your order #ORD-2024-001 has been dispatched and is on its way!', icon: '🚚', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'new_product', title: '🌟 New Arrival!', message: 'Fresh Alphonso Mangoes now available from Ravi Kumar Farm', icon: '🥭', read: true, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '4', type: 'deal', title: '🎉 Exclusive Deal', message: 'Premium members get 15% OFF on all dairy products this week!', icon: '🏷️', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '5', type: 'delivery', title: '✅ Delivered!', message: 'Your order of Fresh Milk has been delivered. Rate your experience!', icon: '📬', read: true, created_at: new Date(Date.now() - 172800000).toISOString() },
        ];
      }
      // Merge admin notifications at the top
      const adminNotifs = loadAdminNotifs();
      setNotifications([...adminNotifs, ...apiNotifs]);
      setLoading(false);
    };
    fetchNotifications();
    // Listen for new admin notifications
    const handleStorage = (e) => { if (e.key === 'sf_notifications_buyers') { setNotifications(prev => [...loadAdminNotifs(), ...prev.filter(n => !n.isAdmin)]); } };
    const handleFocus = () => { setNotifications(prev => [...loadAdminNotifs(), ...prev.filter(n => !n.isAdmin)]); };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => { window.removeEventListener('storage', handleStorage); window.removeEventListener('focus', handleFocus); };
  }, []);

  const markAsRead = async (notifId) => {
    await buyerAPI.markNotificationRead(notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await buyerAPI.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeColor = (type) => {
    const colors = {
      price_drop: '#f59e0b', order: '#3b82f6', new_product: '#8b5cf6',
      deal: '#ef4444', delivery: '#22c55e', wishlist: '#ec4899', system: '#6b7280',
      admin: '#166534',
    };
    return colors[type] || '#6b7280';
  };

  const getTimeDiff = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiBell size={24} /> Notifications
          {unreadCount > 0 && (
            <span style={{
              minWidth: '24px', height: '24px', borderRadius: '12px',
              background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
            }}>{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: '1px solid #22c55e33', borderRadius: '8px',
            padding: '7px 14px', color: '#166534', fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>
            <FiCheck size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔔</div>
          <h3 style={{ color: '#14532d' }}>No notifications yet</h3>
          <p style={{ color: '#6b7280' }}>We'll notify you about orders, deals, and price drops</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(notif => (
            <div key={notif.id} onClick={() => !notif.read && markAsRead(notif.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '14px 18px', borderRadius: '14px',
                background: notif.read ? 'rgba(255,255,255,0.8)' : '#f0fdf4',
                border: `1px solid ${notif.read ? 'rgba(0,0,0,0.04)' : 'rgba(22,163,74,0.15)'}`,
                cursor: notif.read ? 'default' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: notif.read ? 'none' : '0 2px 8px rgba(22,101,52,0.06)',
              }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${getTypeColor(notif.type)}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', flexShrink: 0,
              }}>
                {notif.icon || '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, fontWeight: notif.read ? 500 : 700, color: '#14532d', fontSize: '0.9rem' }}>
                    {notif.title}
                  </p>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {notif.created_at ? getTimeDiff(notif.created_at) : ''}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.4 }}>
                  {notif.message}
                </p>
              </div>
              {!notif.read && (
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#22c55e', flexShrink: 0, marginTop: '8px',
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BuyerPremiumHub — Premium Services (Recommendations, Deals, Early Access)
// ============================================================================
const BuyerPremiumHub = () => {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await buyerAPI.getProducts(1, 20);
        const data = res.data;
        const items = Array.isArray(data) ? data
          : Array.isArray(data?.products) ? data.products
          : Array.isArray(data?.data) ? data.data
          : [];
        setProducts(items);
      } catch { setProducts([]); }
    };
    fetchProducts();
  }, []);

  // Generate recommendations from products
  const recommended = products.slice(0, 4);
  const deals = products.filter(p => (p.discount || p.discount_percent) > 0).slice(0, 4);
  const earlyAccess = products.slice(-3);

  return (
    <div className="dashboard-section">
      {/* Premium Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d, #166534, #15803d)',
        borderRadius: '20px', padding: '28px', marginBottom: '24px',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(74,222,128,0.15)',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2rem' }}>👑</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Premium Services</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.85 }}>
            Unlock exclusive deals, personalized recommendations, and AI-powered shopping
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/buyer/ai-assistant')} style={{
              padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Poppins, sans-serif',
              backdropFilter: 'blur(10px)',
            }}>
              <FiZap size={16} /> AI Assistant
            </button>
            <button onClick={() => navigate('/buyer/notifications')} style={{
              padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Poppins, sans-serif',
              backdropFilter: 'blur(10px)',
            }}>
              <FiBell size={16} /> Price Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Personalized Recommendations */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#14532d', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiStar size={18} color="#f59e0b" /> Personalized For You
          </h3>
          <button onClick={() => navigate('/buyer/shop')} style={{
            background: 'none', border: 'none', color: '#166534', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>View All →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {recommended.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: '14px', overflow: 'hidden',
              border: '1px solid rgba(22,163,74,0.08)', boxShadow: '0 2px 10px rgba(22,101,52,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(22,101,52,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(22,101,52,0.05)'; }}
            >
              <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{
                  position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
                  borderRadius: '6px', fontSize: '0.62rem', fontWeight: 700,
                  background: 'rgba(245,158,11,0.9)', color: '#fff',
                }}>RECOMMENDED</span>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#166534' }}>₹{p.price}</span>
                  {p.average_rating > 0 && <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>⭐ {p.average_rating}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusive Deals */}
      {deals.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 14px', color: '#14532d', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiGift size={18} color="#ef4444" /> Exclusive Deals
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {deals.map(p => (
              <div key={p.id} style={{
                background: 'linear-gradient(135deg, #fef2f2, #fff)', borderRadius: '14px', overflow: 'hidden',
                border: '1px solid #fecaca40', boxShadow: '0 2px 10px rgba(220,38,38,0.06)',
                cursor: 'pointer', transition: 'transform 0.2s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                  <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{
                    position: 'absolute', top: '8px', left: '8px', padding: '3px 10px',
                    borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                    background: '#ef4444', color: '#fff',
                  }}>🔥 {p.discount || p.discount_percent}% OFF</span>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#1f2937' }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#166534' }}>₹{(p.price * (1 - (p.discount || p.discount_percent) / 100)).toFixed(0)}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through' }}>₹{p.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Early Access */}
      <div>
        <h3 style={{ margin: '0 0 14px', color: '#14532d', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiZap size={18} color="#8b5cf6" /> Early Access
          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 700, background: '#8b5cf620', color: '#8b5cf6' }}>PREMIUM</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {earlyAccess.map(p => (
            <div key={p.id} style={{
              background: 'linear-gradient(135deg, #f5f3ff, #fff)', borderRadius: '14px', overflow: 'hidden',
              border: '1px solid #c4b5fd30', boxShadow: '0 2px 10px rgba(139,92,246,0.06)',
              cursor: 'pointer', transition: 'transform 0.2s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                <SmartProductImage product={p} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{
                  position: 'absolute', top: '8px', left: '8px', padding: '3px 8px',
                  borderRadius: '6px', fontSize: '0.62rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff',
                }}>⚡ EARLY ACCESS</span>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#1f2937' }}>{p.name}</p>
                <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>₹{p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Features Card */}
      <div style={{ marginTop: '28px' }}>
        <PremiumFeaturesCard role="buyer" />
      </div>
    </div>
  );
};

// ============================================================================
// BuyerAIAssistant — AI Shopping Assistant Chat
// ============================================================================
const BuyerAIAssistant = () => {
  const [messages, setMessages] = useState([
    { id: '0', sender: 'ai', text: '👋 Hi! I\'m your AI Shopping Assistant. I can help you with:\n\n🛒 Product recommendations\n💰 Finding deals & discounts\n🚚 Delivery information\n🔄 Returns & refunds\n💳 Payment options\n\nWhat would you like help with today?', time: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: input, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await buyerAPI.askAIAssistant(input);
      const reply = res.data?.reply || res.data?.response || res.data?.message || 'I\'m here to help! Could you rephrase your question?';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai', text: reply, time: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai',
        text: '🤖 I\'m having trouble connecting right now. Try asking about products, prices, delivery, or returns!',
        time: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: '🛒 Recommend products', msg: 'Can you recommend some products for me?' },
    { label: '💰 Best deals', msg: 'What are the best deals available right now?' },
    { label: '🌿 Organic options', msg: 'Show me organic product options' },
    { label: '🚚 Delivery info', msg: 'How does delivery work?' },
  ];

  return (
    <div className="dashboard-section" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 120px)', background: '#fff', borderRadius: '16px',
        overflow: 'hidden', border: '1px solid rgba(22,163,74,0.08)',
        boxShadow: '0 4px 20px rgba(22,101,52,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          background: 'linear-gradient(135deg, #14532d, #166534)',
          color: '#fff', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>AI Shopping Assistant</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', opacity: 0.8 }}>
              Powered by SmartFarm AI • Always ready to help
            </p>
          </div>
          <div style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: '12px',
            background: 'rgba(74,222,128,0.2)', fontSize: '0.7rem', fontWeight: 600,
          }}>
            ● Online
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          background: 'linear-gradient(180deg, #f8fdf9, #fff)',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          {messages.map(msg => {
            const isAI = msg.sender === 'ai';
            return (
              <div key={msg.id} style={{ alignSelf: isAI ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexDirection: isAI ? 'row' : 'row-reverse' }}>
                  {isAI && (
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    }}>🤖</div>
                  )}
                  <div style={{
                    padding: '12px 16px', borderRadius: isAI ? '4px 16px 16px 16px' : '16px 16px 4px 16px',
                    background: isAI ? '#fff' : 'linear-gradient(135deg, #166534, #22c55e)',
                    color: isAI ? '#1f2937' : '#fff',
                    fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    boxShadow: isAI ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 8px rgba(22,101,52,0.2)',
                    border: isAI ? '1px solid #f0f0f0' : 'none',
                  }}>
                    {msg.text}
                  </div>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.62rem', color: '#9ca3af', textAlign: isAI ? 'left' : 'right', paddingLeft: isAI ? '40px' : 0 }}>
                  {msg.time ? new Date(msg.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            );
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
              }}>🤖</div>
              <div style={{
                padding: '14px 18px', borderRadius: '4px 16px 16px 16px',
                background: '#fff', border: '1px solid #f0f0f0',
                display: 'flex', gap: '6px',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.5,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {quickActions.map((qa, i) => (
              <button key={i} onClick={() => { setInput(qa.msg); }}
                style={{
                  padding: '7px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 500,
                  background: '#f0fdf4', color: '#166534', border: '1px solid #22c55e33',
                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
              >{qa.label}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #f0f0f0', background: '#fff',
          display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about shopping..."
            disabled={loading}
            style={{
              flex: 1, padding: '12px 18px', borderRadius: '24px',
              border: '1.5px solid rgba(22,163,74,0.2)', outline: 'none',
              fontSize: '0.88rem', fontFamily: 'Poppins, sans-serif',
              background: loading ? '#f9fafb' : '#fff',
            }}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: input.trim() && !loading ? 'linear-gradient(135deg, #166534, #22c55e)' : '#e5e7eb',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'all 0.3s',
              boxShadow: input.trim() && !loading ? '0 2px 8px rgba(22,101,52,0.3)' : 'none',
            }}>
            <FiSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const BuyerNotifBanner = () => {
  const [notifs, setNotifs] = React.useState([]);
  React.useEffect(() => {
    const load = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('sf_notifications_buyers') || '[]');
        setNotifs(stored.filter(n => !n.dismissed));
      } catch {}
    };
    load();
    const h1 = () => load();
    const h2 = (e) => { if (e.key === 'sf_notifications_buyers') load(); };
    window.addEventListener('focus', h1);
    window.addEventListener('storage', h2);
    return () => { window.removeEventListener('focus', h1); window.removeEventListener('storage', h2); };
  }, []);
  const dismiss = (id) => {
    try {
      const stored = JSON.parse(localStorage.getItem('sf_notifications_buyers') || '[]');
      const updated = stored.map(n => n.id === id ? { ...n, dismissed: true } : n);
      localStorage.setItem('sf_notifications_buyers', JSON.stringify(updated));
      setNotifs(updated.filter(n => !n.dismissed));
    } catch {}
  };
  if (notifs.length === 0) return null;
  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {notifs.slice(0, 3).map(n => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 12, border: '1px solid #93c5fd' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>📢</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e40af', fontWeight: 600, lineHeight: 1.4 }}>{n.message}</p>
            <span style={{ fontSize: '0.68rem', color: '#3b82f6' }}>From Admin · {(() => { try { const d = Math.floor((Date.now() - new Date(n.timestamp)) / 60000); return d < 1 ? 'Just now' : d < 60 ? `${d}m ago` : d < 1440 ? `${Math.floor(d/60)}h ago` : 'Recently'; } catch { return ''; } })()}</span>
          </div>
          <button onClick={() => dismiss(n.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #93c5fd', background: '#fff', color: '#1d4ed8', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>✕</button>
        </div>
      ))}
    </div>
  );
};

const BuyerDashboard = () => {
  return (
    <div className="dashboard">
      <Routes>
        <Route
          path="/"
          element={
            <div className="dashboard-overview">
              <h1>Welcome to SmartFarm Marketplace</h1>
              <p>Browse and buy fresh products directly from farmers</p>
              <BuyerNotifBanner />
              <UltraAIBanner role="buyer" />
              <PremiumFeaturesCard role="buyer" />
              <BuyerShop />
            </div>
          }
        />
        <Route path="shop" element={<BuyerShop />} />
        <Route path="cart" element={<BuyerCart />} />
        <Route path="orders" element={<BuyerOrders />} />
        <Route path="purchase-history" element={<PurchaseHistory />} />
        <Route path="profile" element={<BuyerProfile />} />
        <Route path="wishlist" element={<BuyerWishlist />} />
        <Route path="chat" element={<BuyerChat />} />
        <Route path="notifications" element={<BuyerNotifications />} />
        <Route path="premium" element={<BuyerPremiumHub />} />
        <Route path="ai-assistant" element={<BuyerAIAssistant />} />
      </Routes>
    </div>
  );
};

export default BuyerDashboard;
