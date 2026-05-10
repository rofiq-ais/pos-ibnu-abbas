import { useState } from 'react';
import { 
  LayoutGrid, 
  History, 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Menu,
  ShoppingCart,
  ShoppingBag
} from 'lucide-react';
import { usePOS } from './hooks/usePOS';
import { formatCurrency, formatDate } from './utils';
import './index.css';

const defaultImage = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pos = usePOS();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <div className="app-container">
      {/* Sidebar (desktop) */}
      <div className="sidebar">
        <div className="logo" style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>POS</div>
        <button 
          className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
          title="Point of Sale"
        >
          <LayoutGrid size={24} />
        </button>
        <button 
          className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
          title="Transactions"
        >
          <History size={24} />
        </button>
        <button 
          className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
          title="Products"
        >
          <Package size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1>
              {activeTab === 'pos' && 'Point of Sale'}
              {activeTab === 'transactions' && 'Transaction History'}
              {activeTab === 'products' && 'Product Management'}
            </h1>
          </div>
          <div className="header-date" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <div className="logo" style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>POS</div>
                <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
              </div>
              <nav className="mobile-nav">
                <button 
                  className={`mobile-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
                  onClick={() => handleTabChange('pos')}
                >
                  <LayoutGrid size={20} />
                  <span>Point of Sale</span>
                </button>
                <button 
                  className={`mobile-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
                  onClick={() => handleTabChange('transactions')}
                >
                  <History size={20} />
                  <span>Riwayat Transaksi</span>
                </button>
                <button 
                  className={`mobile-nav-item ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => handleTabChange('products')}
                >
                  <Package size={20} />
                  <span>Manajemen Produk</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        <div className="content-area">
          {activeTab === 'pos' && <POSView pos={pos} />}
          {activeTab === 'transactions' && <TransactionsView pos={pos} />}
          {activeTab === 'products' && <ProductsView pos={pos} />}
        </div>
      </div>

      {/* Bottom Nav removed in favor of hamburger menu as per request */}
    </div>
  );
}

// ========================
// POS VIEW
// ========================
function POSView({ pos }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('santri');
  const [showMobileCart, setShowMobileCart] = useState(false);

  const categories = ['All', ...new Set(pos.products.map(p => p.category))];

  const filteredProducts = pos.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = pos.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="pos-layout">
      {/* Products Selection */}
      <div className="products-section">
        <div className="search-bar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Cari produk..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="products-grid">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => pos.addToCart(product)}
            >
              <img 
                src={product.image || defaultImage(product.name)} 
                alt={product.name} 
                className="product-image" 
              />
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-meta">
                  <div className="product-price">{formatCurrency(product.price)}</div>
                  <div className="product-stock">Stok: {product.stock}</div>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <Package size={48} />
              <p>Produk tidak ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart View (Desktop/Table) */}
      <div className="cart-section desktop-cart">
        <CartContent 
          pos={pos} 
          customerName={customerName} 
          setCustomerName={setCustomerName} 
          onCheckout={() => setShowCheckout(true)} 
        />
      </div>

      {/* Mobile Cart Fixed Bar */}
      {pos.cart.length > 0 && (
        <div className="mobile-cart-bar" onClick={() => setShowMobileCart(true)}>
          <div className="mobile-cart-bar-info">
            <div className="cart-badge">
              <ShoppingBag size={20} />
              <span className="badge-count">{pos.cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="mobile-cart-total">
              <span>Total</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
          </div>
          <button className="btn btn-primary mobile-checkout-trigger">
            Lihat Keranjang
          </button>
        </div>
      )}

      {/* Mobile Cart Overlay */}
      {showMobileCart && (
        <div className="mobile-cart-overlay" onClick={() => setShowMobileCart(false)}>
          <div className="mobile-cart-content" onClick={e => e.stopPropagation()}>
            <div className="mobile-cart-header">
              <h2>Detail Pesanan</h2>
              <button className="btn-icon" onClick={() => setShowMobileCart(false)}><X size={24} /></button>
            </div>
            <div className="mobile-cart-body">
              <CartContent 
                pos={pos} 
                customerName={customerName} 
                setCustomerName={setCustomerName} 
                onCheckout={() => {
                  setShowMobileCart(false);
                  setShowCheckout(true);
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal 
          total={cartTotal} 
          customerName={customerName}
          onClose={() => setShowCheckout(false)} 
          onCheckout={(amount) => {
            const result = pos.checkout(amount, customerName);
            if (result.success) {
              alert('Pembayaran berhasil!\nKembalian: ' + formatCurrency(result.transaction.change));
              setShowCheckout(false);
              setCustomerName('santri'); // Reset after checkout
            } else {
              alert(result.message);
            }
          }} 
        />
      )}
    </div>
  );
}

// ========================
// CHECKOUT MODAL
// ========================
function CheckoutModal({ total, customerName, onClose, onCheckout }) {
  const [amountPaid, setAmountPaid] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCheckout(Number(amountPaid));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2>Checkout</h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pembeli: {customerName}</div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }}><X size={24} /></button>
        </div>
        
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Total yang harus dibayar</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {formatCurrency(total)}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Jumlah Bayar</label>
            <input 
              type="number" 
              value={amountPaid} 
              onChange={(e) => setAmountPaid(e.target.value)} 
              placeholder="Masukkan jumlah uang dari pelanggan"
              min={total}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Konfirmasi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================
// TRANSACTIONS VIEW (with detail expand)
// ========================
function TransactionsView({ pos }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="table-container">
      {pos.transactions.length === 0 ? (
        <div className="empty-state">
          <History size={48} />
          <p>Belum ada transaksi.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Pembeli</th>
                <th>Tanggal</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {pos.transactions.map(txn => {
                const isExpanded = expandedId === txn.id;
                const totalItems = txn.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <>
                    <tr key={txn.id} className="txn-row" onClick={() => toggleExpand(txn.id)}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{txn.id}</td>
                      <td style={{ fontWeight: '500' }}>{txn.customerName || 'santri'}</td>
                      <td>{formatDate(txn.date)}</td>
                      <td>{totalItems} item</td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(txn.total)}</td>
                      <td><span className="badge-success">Sukses</span></td>
                      <td>
                        <button className="txn-toggle" onClick={(e) => { e.stopPropagation(); toggleExpand(txn.id); }}>
                          <Eye size={16} />
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${txn.id}-detail`} className="txn-detail-row">
                        <td colSpan="7">
                          <div className="txn-detail-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4>Detail Pesanan</h4>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pembeli: <strong>{txn.customerName || 'santri'}</strong></div>
                            </div>
                            <div className="txn-detail-items">
                              {txn.items.map((item, idx) => (
                                <div key={idx} className="txn-detail-item">
                                  <img 
                                    src={item.image || defaultImage(item.name)} 
                                    alt={item.name} 
                                  />
                                  <div className="txn-detail-item-info">
                                    <div className="txn-detail-item-name">{item.name}</div>
                                    <div className="txn-detail-item-qty">
                                      {item.quantity} x {formatCurrency(item.price)}
                                    </div>
                                  </div>
                                  <div className="txn-detail-item-subtotal">
                                    {formatCurrency(item.price * item.quantity)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="txn-summary-grid">
                              <div className="txn-summary-box">
                                <div className="label">Total</div>
                                <div className="value">{formatCurrency(txn.total)}</div>
                              </div>
                              <div className="txn-summary-box">
                                <div className="label">Dibayar</div>
                                <div className="value">{formatCurrency(txn.amountPaid)}</div>
                              </div>
                              <div className="txn-summary-box">
                                <div className="label">Kembalian</div>
                                <div className="value">{formatCurrency(txn.change)}</div>
                              </div>
                              <div className="txn-summary-box">
                                <div className="label">Total Item</div>
                                <div className="value">{totalItems}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ========================
// PRODUCTS VIEW
// ========================
function ProductsView({ pos }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Daftar Produk</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Tambah Produk
        </button>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Gambar</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pos.products.map(product => (
                <tr key={product.id}>
                  <td>
                    <img 
                      src={product.image || defaultImage(product.name)} 
                      alt={product.name} 
                      style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  </td>
                  <td style={{ fontWeight: '500' }}>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <button className="btn-icon" onClick={() => {
                      if (window.confirm('Yakin ingin menghapus produk ini?')) {
                        pos.deleteProduct(product.id);
                      }
                    }} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {pos.products.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state" style={{ padding: '24px' }}>
                      <p>Belum ada produk.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={(product) => {
            pos.addProduct(product);
            setIsModalOpen(false);
          }} 
        />
      )}
    </div>
  );
}

// ========================
// ADD PRODUCT MODAL
// ========================
function ProductModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    image: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock)
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2>Tambah Produk Baru</h2>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Produk</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Kategori</label>
            <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Harga (Rp)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required min="0" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Stok Awal</label>
              <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} required min="0" />
            </div>
          </div>
          <div className="form-group">
            <label>URL Gambar (Opsional)</label>
            <input type="url" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ========================
// CART CONTENT (Reusable)
// ========================
function CartContent({ pos, customerName, setCustomerName, onCheckout }) {
  const cartTotal = pos.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <div className="cart-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Pesanan</h2>
          <input 
            type="text" 
            placeholder="Nama Pembeli" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px', width: '100%' }}
          />
        </div>
        <button className="btn-icon" onClick={pos.clearCart} title="Kosongkan Keranjang">
          <Trash2 size={20} />
        </button>
      </div>

      <div className="cart-items">
        {pos.cart.length === 0 ? (
          <div className="empty-state">
            <p>Keranjang kosong</p>
          </div>
        ) : (
          pos.cart.map(item => (
            <div key={item.id} className="cart-item">
              <img 
                src={item.image || defaultImage(item.name)} 
                alt={item.name} 
                className="cart-item-img" 
              />
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">{formatCurrency(item.price)}</div>
              </div>
              <div className="cart-item-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--background)', borderRadius: '6px', padding: '2px' }}>
                  <button className="cart-qty-btn" onClick={() => pos.updateQuantity(item.id, -1)} style={{ width: '24px', height: '24px' }}>
                    <Minus size={12}/>
                  </button>
                  <span style={{ fontSize: '0.85rem', width: '20px', textAlign: 'center', fontWeight: '600' }}>
                    {item.quantity}
                  </span>
                  <button className="cart-qty-btn" onClick={() => pos.updateQuantity(item.id, 1)} style={{ width: '24px', height: '24px' }}>
                    <Plus size={12}/>
                  </button>
                </div>
                <button className="btn-icon" onClick={() => pos.removeFromCart(item.id)} style={{ color: 'var(--danger)', padding: '4px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="cart-summary-row">
          <span>Subtotal</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <div className="cart-summary-row">
          <span>Pajak (0%)</span>
          <span>Rp 0</span>
        </div>
        <div className="cart-summary-row cart-total">
          <span>Total</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <button 
          className="btn btn-primary checkout-btn" 
          disabled={pos.cart.length === 0}
          onClick={onCheckout}
        >
          <CreditCard size={20} />
          Bayar {formatCurrency(cartTotal)}
        </button>
      </div>
    </>
  );
}


export default App;
