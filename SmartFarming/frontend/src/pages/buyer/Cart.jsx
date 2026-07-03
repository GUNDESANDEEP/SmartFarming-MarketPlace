import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { buyerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiArrowLeft, FiShoppingBag, FiMinus, FiPlus } from 'react-icons/fi';
import SmartProductImage from '../../utils/SmartProductImage';
import BuyerLayout from './BuyerLayout';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await buyerAPI.getCart();
      setCart(response.data);
    } catch (error) {
      console.error('Cart fetch error:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return handleRemoveItem(itemId);
    try {
      await buyerAPI.updateCartItem(itemId, quantity);
      fetchCart(true); // Silent update for instant feedback
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await buyerAPI.removeFromCart(itemId);
      toast.success('Item removed');
      fetchCart(true); // Silent update
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await buyerAPI.clearCart();
      toast.success('Cart cleared');
      fetchCart(true); // Silent update
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    navigate('/buyer/checkout', { state: { cart } });
  };

  if (loading) {
    return (
      <BuyerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: 16, color: '#94a3b8' }}>Loading cart...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </BuyerLayout>
    );
  }

  return (
    <BuyerLayout>
      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/marketplace" style={S.backBtn}>
          <FiArrowLeft size={18} /> Back
        </Link>
        <h2 style={S.pageTitle}>🧺 Shopping Cart</h2>
      </div>

      {!cart || !cart.items || cart.items.length === 0 ? (
        /* Empty Cart */
        <div className="buyer-card">
          <div className="buyer-empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-icon" style={{ fontSize: '3.5rem', opacity: 0.4 }}>🧺</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '12px 0 6px' }}>Your cart is empty</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 20 }}>Browse our marketplace and add fresh products to your cart</p>
            <button onClick={() => navigate('/buyer/marketplace')} className="buyer-btn buyer-btn-primary">
              <FiShoppingBag size={16} /> Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Cart Items */}
          <div className="buyer-card">
            <div className="buyer-card-header">
              <h3>🛒 Cart Items ({cart.items.length})</h3>
              {cart.items.length > 0 && (
                <button onClick={handleClearCart} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  🗑️ Clear Cart
                </button>
              )}
            </div>
            <div className="buyer-card-body" style={{ padding: 0 }}>
              {cart.items.map((item, idx) => (
                <div key={item.id} style={{
                  display: 'flex', gap: 16, padding: '18px 22px',
                  borderBottom: idx < cart.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  {/* Product Image */}
                  <div style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
                    <SmartProductImage product={item.product} alt={item.product?.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  {/* Product Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                      {item.product?.name || 'Product'}
                    </h4>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      👨‍🌾 By {item.product?.farmer_name || 'Local Farmer'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {(item.product?.description || '').substring(0, 80)}...
                    </p>
                  </div>

                  {/* Price & Controls */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                      ₹{item.product?.price || 0}
                    </span>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={S.qtyBtn}>
                        <FiMinus size={14} />
                      </button>
                      <input type="number" value={item.quantity} min="1"
                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                        style={S.qtyInput} />
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={S.qtyBtn}>
                        <FiPlus size={14} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button onClick={() => handleRemoveItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiTrash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="buyer-card" style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div className="buyer-card-header"><h3>💳 Order Summary</h3></div>
            <div className="buyer-card-body">
              {(() => {
                let fees = { gstPercent: 1, platformPercent: 2, deliveryFlat: 40 };
                try {
                  const stored = localStorage.getItem('sf_admin_fees');
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.deliveryFlat !== undefined) fees = parsed;
                  }
                } catch {}

                const subtotal = cart.total_amount || 0;
                const isFree = subtotal >= 500 || subtotal === 0;
                const shippingFee = isFree ? 0 : fees.deliveryFlat;
                const gstTax = Math.round(subtotal * (fees.gstPercent / 100) * 100) / 100;
                const finalTotal = subtotal + shippingFee + gstTax;

                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16, borderBottom: '1px solid #f1f5f9', marginBottom: 16 }}>
                      <div style={S.summaryRow}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Subtotal</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>₹{subtotal}</span>
                      </div>
                      <div style={S.summaryRow}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Shipping</span>
                        <span style={{ fontWeight: 600, color: shippingFee === 0 ? '#16a34a' : '#1e293b' }}>
                          {shippingFee === 0 ? '₹0 (Free)' : `₹${shippingFee}`}
                        </span>
                      </div>
                      <div style={S.summaryRow}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Tax ({fees.gstPercent}%)</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>₹{gstTax.toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ ...S.summaryRow, marginBottom: 20 }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>Total</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                        ₹{finalTotal.toFixed(2)}
                      </span>
                    </div>
                  </>
                );
              })()}

              <button onClick={handleCheckout} className="buyer-btn buyer-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: '0.9rem' }}>
                🛒 Proceed to Checkout
              </button>
              <button onClick={() => navigate('/buyer/marketplace')} className="buyer-btn buyer-btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  qtyBtn: { width: 30, height: 30, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' },
  qtyInput: { width: 40, height: 30, border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', outline: 'none' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};
