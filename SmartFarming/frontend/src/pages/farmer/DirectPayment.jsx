import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { paymentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import ReceiptViewer from '../../components/ReceiptViewer';

const PAYMENT_METHODS = [
  { key: 'cash', icon: '💵', label: 'Cash', color: '#16a34a' },
  { key: 'upi', icon: '📱', label: 'UPI', color: '#7c3aed' },
  { key: 'bank_transfer', icon: '🏦', label: 'Bank Transfer', color: '#1d4ed8' },
  { key: 'card', icon: '💳', label: 'Card', color: '#0891b2' },
];

const emptyItem = { product_name: '', product_quality: 'Standard', quantity_kg: '', price_per_kg: '' };

export default function DirectPayment() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Sale form state
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [buyerInfo, setBuyerInfo] = useState({ name: '', phone: '', email: '', address: '' });

  // Receipt state
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  // Admin fees (GST, Platform, Delivery)
  const [adminFees, setAdminFees] = useState({ gstPercent: 0, platformPercent: 0, deliveryFlat: 0 });

  useEffect(() => {
    const loadFees = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('sf_admin_fees') || '{}');
        setAdminFees({
          gstPercent: parseFloat(stored.gstPercent) || 0,
          platformPercent: parseFloat(stored.platformPercent) || 0,
          deliveryFlat: parseFloat(stored.deliveryFlat) || 0,
        });
      } catch {}
    };
    loadFees();
    const handleStorage = (e) => { if (e.key === 'sf_admin_fees') loadFees(); };
    const handleFocus = () => loadFees();
    // Poll every 2 seconds for instant admin fee sync
    const pollInterval = setInterval(loadFees, 2000);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => { clearInterval(pollInterval); window.removeEventListener('storage', handleStorage); window.removeEventListener('focus', handleFocus); };
  }, []);

  // Sales history
  const [salesHistory, setSalesHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('direct_sales_history') || '[]');
    } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState('new-sale');

  // ─── Item handlers ────────────────────────────────────────────────
  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const getItemTotal = (item) => {
    const qty = parseFloat(item.quantity_kg) || 0;
    const price = parseFloat(item.price_per_kg) || 0;
    return qty * price;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const discountAmount = parseFloat(discount) || 0;
  const gstAmount = Math.round((subtotal * adminFees.gstPercent) / 100 * 100) / 100;
  const platformFeeAmount = Math.round((subtotal * adminFees.platformPercent) / 100 * 100) / 100;
  const deliveryFeeAmount = adminFees.deliveryFlat;
  const totalFees = gstAmount + platformFeeAmount + deliveryFeeAmount;
  const grandTotal = Math.max(subtotal + totalFees - discountAmount, 0);

  // ─── Generate Receipt ──────────────────────────────────────────────
  const handleGenerateReceipt = async () => {
    // Validation
    const validItems = items.filter(i => i.product_name && parseFloat(i.quantity_kg) > 0 && parseFloat(i.price_per_kg) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one product with quantity and price');
      return;
    }
    if (!buyerInfo.name.trim()) {
      toast.error('Please enter buyer name');
      return;
    }

    setLoading(true);

    try {
      // Attempt direct sale via API
      const saleData = {
        buyer_name: buyerInfo.name,
        buyer_phone: buyerInfo.phone,
        buyer_email: buyerInfo.email,
        buyer_address: buyerInfo.address,
        items: validItems.map(i => ({
          product_name: i.product_name,
          product_quality: i.product_quality,
          quantity_kg: parseFloat(i.quantity_kg),
          price_per_kg: parseFloat(i.price_per_kg),
          item_total: parseFloat(i.quantity_kg) * parseFloat(i.price_per_kg),
        })),
        subtotal,
        discount: discountAmount,
        grand_total: grandTotal,
        payment_type: paymentMethod,
        payment_status: 'completed',
        notes,
      };

      let receiptData;

      try {
        const res = await paymentsAPI.directSale(saleData);
        receiptData = res.data;
      } catch {
        // API not available — generate receipt locally
        receiptData = null;
      }

      // Build receipt (merge API response or create local receipt)
      const now = new Date();
      const receiptId = receiptData?.receipt_id || `DS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
      
      const receipt = {
        receipt_id: receiptId,
        transaction_id: receiptData?.transaction_id || `TXN-${Date.now()}`,
        created_at: receiptData?.created_at || now.toISOString(),
        farmer_name: user?.name || user?.first_name || 'Farmer',
        farmer_phone: user?.phone || '',
        farmer_email: user?.email || '',
        buyer_name: buyerInfo.name,
        buyer_phone: buyerInfo.phone,
        buyer_email: buyerInfo.email,
        items: validItems.map(i => ({
          product_name: i.product_name,
          product_quality: i.product_quality,
          quantity_kg: parseFloat(i.quantity_kg),
          price_per_kg: parseFloat(i.price_per_kg),
          item_total: parseFloat(i.quantity_kg) * parseFloat(i.price_per_kg),
        })),
        subtotal,
        discount: discountAmount,
        gst_percent: adminFees.gstPercent,
        gst_amount: gstAmount,
        platform_percent: adminFees.platformPercent,
        platform_fee: platformFeeAmount,
        delivery_fee: deliveryFeeAmount,
        tax_amount: gstAmount,
        grand_total: grandTotal,
        total_amount: grandTotal,
        payment_type: paymentMethod,
        payment_status: 'completed',
        notes,
        ...receiptData,
      };

      // Save to local history
      const updatedHistory = [receipt, ...salesHistory].slice(0, 50);
      setSalesHistory(updatedHistory);
      localStorage.setItem('direct_sales_history', JSON.stringify(updatedHistory));

      setGeneratedReceipt(receipt);
      toast.success('Receipt generated successfully! 🧾', { duration: 4000 });

      // Reset form
      setItems([{ ...emptyItem }]);
      setBuyerInfo({ name: '', phone: '', email: '', address: '' });
      setDiscount('');
      setNotes('');
    } catch (error) {
      toast.error('Failed to generate receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────
  const todaySales = salesHistory.filter(s => {
    const d = new Date(s.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const todayTotal = todaySales.reduce((s, r) => s + (r.grand_total || 0), 0);
  const totalSales = salesHistory.reduce((s, r) => s + (r.grand_total || 0), 0);

  return (
    <SellerLayout title="Direct Payment" subtitle="Record sales & generate receipts instantly">
      {/* Stats */}
      <div className="seller-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[
          { label: 'Today\'s Sales', value: `₹${todayTotal.toLocaleString('en-IN')}`, icon: '📅', color: 'green' },
          { label: 'Transactions Today', value: todaySales.length, icon: '🧾', color: 'blue' },
          { label: 'Total Direct Sales', value: `₹${totalSales.toLocaleString('en-IN')}`, icon: '💰', color: 'purple' },
          { label: 'All Transactions', value: salesHistory.length, icon: '📊', color: 'teal' },
        ].map((s, i) => (
          <div key={i} className="seller-stat-card">
            <div className={`seller-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="seller-stat-info">
              <p>{s.label}</p>
              <h3>{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="seller-tabs-pill" style={{ marginBottom: 16 }}>
        <button className={`seller-tab-pill ${activeTab === 'new-sale' ? 'active' : ''}`} onClick={() => setActiveTab('new-sale')}>
          💳 New Sale
        </button>
        <button className={`seller-tab-pill ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📋 Sales History ({salesHistory.length})
        </button>
      </div>

      {activeTab === 'new-sale' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
          {/* Left: Sale Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Payment Method */}
            <div className="seller-card">
              <div className="seller-card-header"><h3>💳 Payment Method</h3></div>
              <div className="seller-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      style={{
                        padding: '14px 10px',
                        borderRadius: 14,
                        border: paymentMethod === m.key ? `2px solid ${m.color}` : '2px solid #e5e7eb',
                        background: paymentMethod === m.key ? `${m.color}12` : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.25s ease',
                        fontFamily: 'Poppins, sans-serif',
                        transform: paymentMethod === m.key ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{m.icon}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: paymentMethod === m.key ? m.color : '#6b7280' }}>{m.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="seller-card">
              <div className="seller-card-header"><h3>👤 Buyer Details</h3></div>
              <div className="seller-card-body">
                <div className="seller-form-row">
                  <div className="seller-form-group">
                    <label className="seller-form-label">Buyer Name *</label>
                    <input className="seller-form-input" placeholder="Enter buyer name" value={buyerInfo.name}
                      onChange={e => setBuyerInfo(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="seller-form-group">
                    <label className="seller-form-label">Phone Number</label>
                    <input className="seller-form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={buyerInfo.phone}
                      onChange={e => setBuyerInfo(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="seller-form-row">
                  <div className="seller-form-group">
                    <label className="seller-form-label">Email</label>
                    <input className="seller-form-input" type="email" placeholder="buyer@email.com" value={buyerInfo.email}
                      onChange={e => setBuyerInfo(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="seller-form-group">
                    <label className="seller-form-label">Address</label>
                    <input className="seller-form-input" placeholder="Village, District" value={buyerInfo.address}
                      onChange={e => setBuyerInfo(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="seller-card">
              <div className="seller-card-header">
                <h3>📦 Products / Items</h3>
                <button className="seller-btn seller-btn-primary seller-btn-sm" onClick={addItem}>
                  ➕ Add Item
                </button>
              </div>
              <div className="seller-card-body" style={{ padding: 0 }}>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: 0, padding: '10px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderBottom: '1px solid rgba(22,163,74,0.1)', fontSize: '0.7rem', fontWeight: 700, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Product Name</span>
                  <span>Quality</span>
                  <span>Qty (KG)</span>
                  <span>Price/KG</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                  <span></span>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', gap: 8, padding: '12px 18px', borderBottom: '1px solid #f3f4f6', alignItems: 'center', animation: 'sellerFadeIn 0.3s ease-out' }}>
                    <input
                      className="seller-form-input"
                      placeholder="e.g. Tomatoes, Rice..."
                      value={item.product_name}
                      onChange={e => updateItem(idx, 'product_name', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                    />
                    <select
                      className="seller-form-select"
                      value={item.product_quality}
                      onChange={e => updateItem(idx, 'product_quality', e.target.value)}
                      style={{ padding: '8px 6px', fontSize: '0.8rem' }}
                    >
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Organic">Organic</option>
                      <option value="Grade A">Grade A</option>
                      <option value="Grade B">Grade B</option>
                    </select>
                    <input
                      className="seller-form-input"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={item.quantity_kg}
                      onChange={e => updateItem(idx, 'quantity_kg', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                    />
                    <input
                      className="seller-form-input"
                      type="number"
                      min="0"
                      placeholder="₹0"
                      value={item.price_per_kg}
                      onChange={e => updateItem(idx, 'price_per_kg', e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                    />
                    <div style={{ textAlign: 'right', fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
                      ₹{getItemTotal(item).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 'none',
                        background: items.length === 1 ? '#f3f4f6' : '#fef2f2',
                        color: items.length === 1 ? '#d1d5db' : '#dc2626',
                        cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontFamily: 'Poppins, sans-serif',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add another item link */}
                <div style={{ padding: '12px 18px', textAlign: 'center' }}>
                  <button onClick={addItem} style={{ background: 'none', border: '1.5px dashed #22c55e', color: '#16a34a', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Poppins, sans-serif', transition: 'all 0.2s ease' }}>
                    ➕ Add Another Item
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="seller-card">
              <div className="seller-card-header"><h3>📝 Notes (Optional)</h3></div>
              <div className="seller-card-body">
                <textarea
                  className="seller-form-textarea"
                  placeholder="Any additional notes for this sale..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
          </div>

          {/* Right: Bill Summary (sticky) */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="seller-card" style={{ border: '2px solid rgba(22,163,74,0.15)' }}>
              <div className="seller-card-header" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
                <h3>🧾 Bill Summary</h3>
              </div>
              <div className="seller-card-body">
                {/* Items summary */}
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14 }}>
                  {items.filter(i => i.product_name).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.product_name}</span>
                        <span style={{ color: '#9ca3af', fontSize: '0.72rem', marginLeft: 6 }}>
                          {item.quantity_kg || 0} kg × ₹{item.price_per_kg || 0}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#166534' }}>₹{getItemTotal(item).toFixed(2)}</span>
                    </div>
                  ))}
                  {items.filter(i => i.product_name).length === 0 && (
                    <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center', padding: 16 }}>No items added yet</p>
                  )}
                </div>

                {/* Totals */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: '#555' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                  </div>

                  {/* Admin Fees Breakdown */}
                  {adminFees.gstPercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <span>GST ({adminFees.gstPercent}%)</span>
                      <span style={{ fontWeight: 600, color: '#d97706' }}>+₹{gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {adminFees.platformPercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <span>Platform Fee ({adminFees.platformPercent}%)</span>
                      <span style={{ fontWeight: 600, color: '#7c3aed' }}>+₹{platformFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {adminFees.deliveryFlat > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem', color: '#6b7280' }}>
                      <span>Delivery Fee</span>
                      <span style={{ fontWeight: 600, color: '#0891b2' }}>+₹{deliveryFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {totalFees > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem', color: '#374151', paddingTop: 4, borderTop: '1px dashed #e5e7eb' }}>
                      <span style={{ fontWeight: 600 }}>Total Fees</span>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>+₹{totalFees.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Discount Input */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.85rem', color: '#555' }}>Discount</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: '#16a34a', fontSize: '0.85rem' }}>-₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discount}
                        onChange={e => setDiscount(e.target.value)}
                        style={{ width: 70, padding: '4px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'Poppins, sans-serif', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #166534', marginTop: 8 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d' }}>Grand Total</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#166534' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{PAYMENT_METHODS.find(m => m.key === paymentMethod)?.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment via</div>
                    <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.88rem' }}>{PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label}</div>
                  </div>
                  <span className="seller-badge seller-badge-success" style={{ marginLeft: 'auto' }}>✅ Paid</span>
                </div>

                {/* Buyer */}
                {buyerInfo.name && (
                  <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 12, background: '#faf5ff', border: '1px solid rgba(168,85,247,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Buyer</div>
                    <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.85rem' }}>
                      {buyerInfo.name} {buyerInfo.phone && `· ${buyerInfo.phone}`}
                    </div>
                  </div>
                )}

                {/* Generate Receipt Button */}
                <button
                  className="seller-btn seller-btn-primary seller-btn-lg"
                  style={{ width: '100%', marginTop: 18, justifyContent: 'center', fontSize: '1rem', padding: '16px 24px' }}
                  onClick={handleGenerateReceipt}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="seller-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                      Generating...
                    </>
                  ) : (
                    '🧾 Generate Receipt'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sales History Tab */
        <div className="seller-card">
          <div className="seller-card-header">
            <h3>📋 Sales History</h3>
            {salesHistory.length > 0 && (
              <button className="seller-btn seller-btn-ghost seller-btn-sm" onClick={() => { if (window.confirm('Clear all sales history?')) { setSalesHistory([]); localStorage.removeItem('direct_sales_history'); toast.success('History cleared'); } }}>
                🗑️ Clear All
              </button>
            )}
          </div>
          <div className="seller-card-body" style={{ padding: 0 }}>
            {salesHistory.length > 0 ? (
              <div className="seller-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Receipt ID</th>
                      <th>Date</th>
                      <th>Buyer</th>
                      <th>Items</th>
                      <th>Payment</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((sale, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#166534', fontSize: '0.78rem' }}>{sale.receipt_id?.substring(0, 18) || 'N/A'}...</td>
                        <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          <br />
                          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sale.buyer_name}</span>
                          {sale.buyer_phone && <span style={{ display: 'block', fontSize: '0.7rem', color: '#9ca3af' }}>{sale.buyer_phone}</span>}
                        </td>
                        <td>
                          <span className="seller-badge seller-badge-info">{sale.items?.length || 0} items</span>
                        </td>
                        <td>
                          <span className="seller-badge seller-badge-success" style={{ textTransform: 'uppercase', fontSize: '0.62rem' }}>
                            {PAYMENT_METHODS.find(m => m.key === sale.payment_type)?.icon} {sale.payment_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: '#166534', fontSize: '1rem' }}>₹{parseFloat(sale.grand_total || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <button
                            className="seller-btn seller-btn-secondary seller-btn-sm"
                            onClick={() => setGeneratedReceipt(sale)}
                          >
                            🧾 View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="seller-empty-state">
                <div className="empty-icon">🧾</div>
                <h3>No sales recorded yet</h3>
                <p>Record your first direct sale to see it here</p>
                <button className="seller-btn seller-btn-primary seller-btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab('new-sale')}>
                  💳 Record New Sale
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {generatedReceipt && (
        <ReceiptViewer receipt={generatedReceipt} onClose={() => setGeneratedReceipt(null)} />
      )}

      {/* Responsive styles for the form grid */}
      <style>{`
        @media (max-width: 900px) {
          .seller-content > div:first-child > div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </SellerLayout>
  );
}
