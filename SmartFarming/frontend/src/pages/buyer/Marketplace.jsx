import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { buyerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiHeart, FiShoppingCart, FiArrowLeft } from 'react-icons/fi';
import SmartProductImage from '../../utils/SmartProductImage';
import BuyerLayout from './BuyerLayout';

export default function BuyerMarketplace() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000,
    category: '',
  });

  const fetchWishlist = async () => {
    try {
      const response = await buyerAPI.getWishlist();
      setWishlist(response.data || []);
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/login');
      return;
    }
    fetchProducts();
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, page, filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let response;
      if (searchQuery) {
        response = await buyerAPI.searchProducts(searchQuery, page, 12);
      } else {
        response = await buyerAPI.getProducts(page, 12, filters);
      }
      setProducts(response.data.data || []);
      const pagination = response.data.pagination;
      setTotalPages(pagination?.total ? Math.ceil(pagination.total / 12) : 1);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleToggleWishlist = async (product) => {
    try {
      const isLiked = wishlist.some((p) => p.id === product.id);
      if (isLiked) {
        await buyerAPI.removeFromWishlist(product.id);
        setWishlist(wishlist.filter((p) => p.id !== product.id));
        toast.success('Removed from wishlist');
      } else {
        await buyerAPI.addToWishlist(product);
        setWishlist([...wishlist, product]);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await buyerAPI.addToCart(product, 1);
      toast.success(`${product.name || 'Product'} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async (product) => {
    try {
      await buyerAPI.addToCart(product, 1);
      const response = await buyerAPI.getCart();
      navigate('/buyer/checkout', { state: { cart: response.data } });
    } catch (error) {
      toast.error('Failed to proceed to order');
    }
  };

  return (
    <BuyerLayout>
      {/* Back + Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/buyer/dashboard" style={S.backBtn}>
          <FiArrowLeft size={18} /> Back
        </Link>
        <h2 style={S.pageTitle}>🛒 Marketplace</h2>
      </div>

      {/* Search Bar */}
      <div style={S.searchWrap}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flex: 1 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search fresh vegetables, fruits, grains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={S.searchInput}
            />
          </div>
          <button type="submit" style={S.searchBtn}>Search</button>
        </form>
      </div>

      {/* Filters */}
      <div className="buyer-card" style={{ marginBottom: 20 }}>
        <div className="buyer-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' }}>
          <div>
            <label style={S.label}>Min Price</label>
            <input type="number" value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: parseInt(e.target.value) })}
              style={S.filterInput} />
          </div>
          <div>
            <label style={S.label}>Max Price</label>
            <input type="number" value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
              style={S.filterInput} />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={S.filterInput}>
              <option value="">All Categories</option>
              <option value="vegetables">🥬 Vegetables</option>
              <option value="fruits">🍎 Fruits</option>
              <option value="grains">🌾 Grains</option>
              <option value="dairy">🥛 Dairy</option>
            </select>
          </div>
          <button onClick={fetchProducts} className="buyer-btn buyer-btn-primary">🔍 Apply Filters</button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ color: '#94a3b8', marginTop: 12 }}>Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <>
          <div style={S.productsGrid}>
            {products.map((product) => (
              <div key={product.id} className="buyer-card" style={{ cursor: 'pointer' }}>
                {/* Product Image */}
                <div style={S.imgWrap}>
                  <SmartProductImage product={product} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                  <button onClick={(e) => { e.stopPropagation(); handleToggleWishlist(product); }} style={S.heartBtn}>
                    <FiHeart size={16} fill={wishlist.some(p => p.id === product.id) ? '#ef4444' : 'none'} />
                  </button>
                </div>

                {/* Product Info */}
                <div style={{ padding: '16px 18px' }}>
                  <h3 style={S.prodName}>{product.name}</h3>
                  <p style={S.prodDesc}>{product.description?.substring(0, 80)}{product.description?.length > 80 ? '...' : ''}</p>

                  {/* Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {product.review_count > 0 ? (
                      <>
                        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>⭐</span>
                        <span style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 600 }}>
                          {product.rating ? product.rating.toFixed(1) : '0.0'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>⭐</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No reviews yet
                        </span>
                      </>
                    )}
                  </div>

                  {/* Farmer */}
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 12 }}>
                    👨‍🌾 By {product.farmer_name || 'Local Farmer'}
                  </p>

                  {/* Price & Stock */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={S.price}>₹{product.price}/{product.unit || 'kg'}</span>
                    <span style={{
                      ...S.stockBadge,
                      background: product.stock > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: product.stock > 0 ? '#16a34a' : '#dc2626',
                    }}>
                      {product.stock > 0 ? '✅ In Stock' : '❌ Out'}
                    </span>
                  </div>

                  {/* Add & Order Now Actions */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      disabled={product.stock === 0} style={{
                        ...S.addCartBtn,
                        flex: 1,
                        opacity: product.stock === 0 ? 0.5 : 1,
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        padding: '10px 8px',
                        fontSize: '0.78rem'
                      }}>
                      <FiShoppingCart size={13} /> Add
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                      disabled={product.stock === 0} style={{
                        ...S.buyNowBtn,
                        flex: 1.2,
                        opacity: product.stock === 0 ? 0.5 : 1,
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                        padding: '10px 8px',
                        fontSize: '0.78rem'
                      }}>
                      ⚡ Order Now
                    </button>
                  </div>

                  {/* Chat with Farmer */}
                  <button onClick={(e) => {
                    e.stopPropagation();
                    navigate('/buyer/chat', { state: { farmer: { id: product.farmer_id, name: product.farmer_name } } });
                  }} style={S.chatBtn}>
                    💬 Chat with Farmer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="buyer-btn buyer-btn-secondary buyer-btn-sm" style={{ opacity: page === 1 ? 0.5 : 1 }}>
                ← Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`buyer-btn buyer-btn-sm ${page === p ? 'buyer-btn-primary' : 'buyer-btn-secondary'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="buyer-btn buyer-btn-secondary buyer-btn-sm" style={{ opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="buyer-empty-state">
          <div className="empty-icon">🛒</div>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search query</p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </BuyerLayout>
  );
}

const S = {
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', textDecoration: 'none', touchAction: 'manipulation' },
  pageTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  searchWrap: { display: 'flex', gap: 12, marginBottom: 20 },
  searchInput: { width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '0.88rem', background: '#fff', outline: 'none', color: '#1e293b', boxSizing: 'border-box' },
  searchBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  label: { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterInput: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.85rem', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 },
  imgWrap: { width: '100%', height: 180, overflow: 'hidden', position: 'relative', background: '#f1f5f9' },
  heartBtn: { position: 'absolute', top: 10, right: 10, background: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  prodName: { fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  prodDesc: { fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: 8, minHeight: 32 },
  price: { fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' },
  stockBadge: { fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20 },
  addCartBtn: { width: '100%', padding: '10px 16px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' },
  buyNowBtn: { width: '100%', padding: '10px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' },
  chatBtn: { width: '100%', padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, color: '#2563eb', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', marginTop: 8 },
};
