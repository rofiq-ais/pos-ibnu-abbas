import { useState, useEffect } from 'react';
import { Search, Package, ShoppingBag, X, CreditCard, Minus, Plus, Trash2, Camera, Copy, Send, Check, Printer, PlusCircle, User } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { formatCurrency } from '../utils';
import { defaultImage } from './Shared';

// ── POSView ───────────────────────────────────────────────────────────────────
export function POSView({ pos }) {
  const [searchTerm,         setSearchTerm]         = useState('');
  const [category,           setCategory]           = useState('All');
  const [showCheckout,       setShowCheckout]       = useState(false);
  const [customerName,       setCustomerName]       = useState('santri');
  const [cashierName,        setCashierName]        = useState(() => {
    try {
      return localStorage.getItem('pos_cashier_name') || 'Ami Azzam';
    } catch {
      return 'Ami Azzam';
    }
  });
  const [showMobileCart,     setShowMobileCart]     = useState(false);
  const [successTransaction, setSuccessTransaction] = useState(null); // { transaction, offlineMode }
  const [showCameraScanner,  setShowCameraScanner]  = useState(false);
  const [showSearchInput,    setShowSearchInput]    = useState(true);
  const [showManualItemModal, setShowManualItemModal] = useState(false);

  const handleCashierChange = (name) => {
    setCashierName(name);
    try {
      localStorage.setItem('pos_cashier_name', name);
    } catch (e) {
      console.warn('Gagal menyimpan nama kasir ke localStorage:', e);
    }
  };

  // Audio Beep generator
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCameraScan = (barcodeText) => {
    const cleanBarcode = barcodeText.trim();
    const found = pos.products.find(p => p.barcode === cleanBarcode);
    if (found) {
      playBeep();
      pos.addToCart(found);
      return { success: true, name: found.name };
    } else {
      // Beep error (suara lebih rendah)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (_) {}
      pos.setError(`Barang dengan barcode "${cleanBarcode}" tidak terdaftar.`);
      return { success: false, error: 'Tidak terdaftar' };
    }
  };

  // ── Global Barcode Scanner Listener ──
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Abaikan jika fokus sedang berada pada kolom input/form manual
      const targetTag = e.target.tagName.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      const currentTime = Date.now();
      
      // Jika jarak ketikan > 50ms, kemungkinan diketik manual, reset buffer
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          e.preventDefault();
          const cleanBarcode = buffer.trim();
          const found = pos.products.find(p => p.barcode === cleanBarcode);
          if (found) {
            pos.addToCart(found);
          } else {
            pos.setError(`Barang dengan barcode "${cleanBarcode}" tidak ditemukan.`);
          }
          buffer = '';
        }
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos.products, pos.addToCart, pos.setError]);

  const categories      = ['All', ...new Set(pos.products.map(p => p.category))];
  const filteredProducts = pos.products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (category === 'All' || p.category === category)
  );
  const cartTotal = pos.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckoutSuccess = async (amount) => {
    const result = await pos.checkout(amount, customerName, cashierName);
    if (result.success) {
      setShowCheckout(false);
      setCustomerName('santri');
      setSuccessTransaction({ transaction: result.transaction, offlineMode: !!result.offlineMode });
    }
    return result;
  };

  return (
    <div className="pos-layout">

      {/* ── Product Grid ── */}
      <div className="products-section">
        <div className="products-header">
          <div className="search-bar" style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-outline" 
              style={{ width: '44px', height: '44px', padding: 0, justifyContent: 'center', borderRadius: '12px', flexShrink: 0 }} 
              onClick={() => setShowCameraScanner(true)}
              title="Scan Kamera"
            >
              <Camera size={20} />
            </button>

            <div className="search-input-wrapper" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder="Cari produk..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                autoFocus
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          </div>

          {/* Deretan chip kategori */}
          <div className="category-chips" onWheel={(e) => { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}>
            {categories.map(c => (
              <button 
                key={c} 
                className={`category-chip ${category === c ? 'active' : ''}`}
                onClick={() => {
                  setCategory(c);
                  // Center the active chip horizontally on larger screens (skip 'All')
                  if (c !== 'All') {
                    // Use a short timeout to wait for state update/render
                    setTimeout(() => {
                      const active = document.querySelector('.category-chip.active');
                      if (active) {
                        active.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                      }
                    }, 0);
                  }
                }}
              >
                {c === 'All' ? 'Semua Kategori' : c}
              </button>
            ))}
          </div>
        </div>

        <div className="products-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card" onClick={() => pos.addToCart(product)}>
              <img src={product.image || defaultImage(product.name)} alt={product.name} className="product-image" />
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
              <Package size={48} /><p>Produk tidak ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop Cart ── */}
      <div className="cart-section desktop-cart">
        <CartContent
          pos={pos}
          customerName={customerName}
          setCustomerName={setCustomerName}
          cashierName={cashierName}
          onCashierChange={handleCashierChange}
          onCheckout={() => setShowCheckout(true)}
          onAddManualItemClick={() => setShowManualItemModal(true)}
        />
      </div>

      {/* ── Mobile Cart Bar ── Sembunyikan saat checkout modal aktif */}
      {pos.cart.length > 0 && !showCheckout && !successTransaction && (
        <div className="mobile-cart-bar" onClick={() => setShowMobileCart(true)}>
          <div className="mobile-cart-bar-info">
            <div className="cart-badge">
              <ShoppingBag size={20} />
              <span className="badge-count">{pos.cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div className="mobile-cart-total">
              <span>Total</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
          </div>
          <button className="btn btn-primary mobile-checkout-trigger">Lihat Keranjang</button>
        </div>
      )}

      {/* ── Mobile Cart Overlay ── */}
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
                cashierName={cashierName}
                onCashierChange={handleCashierChange}
                onCheckout={() => { setShowMobileCart(false); setShowCheckout(true); }}
                onAddManualItemClick={() => setShowManualItemModal(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {showCheckout && (
        <CheckoutModal
          total={cartTotal}
          customerName={customerName}
          cashierName={cashierName}
          onClose={() => setShowCheckout(false)}
          onCheckout={handleCheckoutSuccess}
        />
      )}

      {/* ── Success Modal ── */}
      {successTransaction && (
        <TransactionSuccessModal
          transaction={successTransaction.transaction}
          offlineMode={successTransaction.offlineMode}
          onClose={() => setSuccessTransaction(null)}
        />
      )}

      {/* ── Camera Scanner Modal ── */}
      {showCameraScanner && (
        <CameraScannerModal
          onClose={() => setShowCameraScanner(false)}
          onScan={handleCameraScan}
        />
      )}

      {/* ── Manual Item Modal ── */}
      {showManualItemModal && (
        <ManualItemModal
          onClose={() => setShowManualItemModal(false)}
          onAdd={(item) => pos.addToCart(item)}
        />
      )}
    </div>
  );
}

// ── CameraScannerModal Component ─────────────────────────────────────────────
function CameraScannerModal({ onClose, onScan }) {
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null); // { success: boolean, text: string }

  // Deteksi Kamera
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prioritaskan kamera belakang jika ada
        const backCam = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('environment') || 
          d.label.toLowerCase().includes('rear')
        );
        setActiveCameraId(backCam ? backCam.id : devices[0].id);
      } else {
        setErrorMsg('Kamera tidak ditemukan. Pastikan browser diizinkan menggunakan kamera.');
      }
    }).catch(err => {
      setErrorMsg('Gagal mengakses kamera: ' + err.message);
    });
  }, []);

  // Inisialisasi Scanner saat kamera aktif berganti
  useEffect(() => {
    if (!activeCameraId) return;

    const html5Qrcode = new Html5Qrcode("camera-reader");
    let isScanning = true;
    let throttleTimeout = null;

    html5Qrcode.start(
      activeCameraId,
      {
        fps: 15,
        qrbox: (width, height) => {
          // Bidang scan horizontal panjang cocok untuk barcode EAN
          return { width: Math.min(width * 0.85, 300), height: 160 };
        },
        aspectRatio: 1.0
      },
      (decodedText) => {
        if (!isScanning) return;
        
        // Jeda 1.8 detik antar scan agar tidak masuk berulang kali
        isScanning = false;
        const res = onScan(decodedText);
        
        if (res.success) {
          setScanFeedback({ success: true, text: `✓ Ter-scan: ${res.name}` });
        } else {
          setScanFeedback({ success: false, text: `⚠ Gagal: ${decodedText} tidak terdaftar` });
        }

        throttleTimeout = setTimeout(() => {
          isScanning = true;
          setScanFeedback(null);
        }, 1800);
      },
      () => {} // Silent verbosity
    ).catch(err => {
      setErrorMsg('Gagal memulai kamera: ' + err.message);
    });

    return () => {
      isScanning = false;
      if (throttleTimeout) clearTimeout(throttleTimeout);
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error("Stop scanner error:", err));
      }
    };
  }, [activeCameraId]);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content camera-scanner-modal" style={{ maxWidth: '420px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Scan Barcode Kamera</h2>
          <button className="btn-icon" onClick={onClose} style={{ padding: 0 }}><X size={24} /></button>
        </div>

        {errorMsg ? (
          <div className="input-error" style={{ textAlign: 'center', padding: '24px 0' }}>
            <p>{errorMsg}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Pilihan Kamera (Front/Back) */}
            {cameras.length > 1 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select value={activeCameraId} onChange={e => setActiveCameraId(e.target.value)}>
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Viewfinder Camera */}
            <div className="camera-viewfinder-wrapper">
              <div id="camera-reader" style={{ width: '100%', borderRadius: '14px', overflow: 'hidden' }}></div>
              <div className="viewfinder-overlay">
                <div className="laser-line" />
                <div className="corner-border top-left" />
                <div className="corner-border top-right" />
                <div className="corner-border bottom-left" />
                <div className="corner-border bottom-right" />
              </div>
            </div>

            {/* Status Feedback hasil Scan */}
            <div className="scanner-status-box">
              {scanFeedback ? (
                <div className={`scan-feedback-message ${scanFeedback.success ? 'success' : 'fail'}`}>
                  {scanFeedback.text}
                </div>
              ) : (
                <div className="scan-instruction">
                  Posisikan garis barcode tepat di tengah bidang laser
                </div>
              )}
            </div>

            <button className="btn btn-outline" style={{ width: '100%' }} onClick={onClose}>
              Tutup Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CartContent ───────────────────────────────────────────────────────────────
function CartContent({ pos, customerName, setCustomerName, cashierName, onCashierChange, onCheckout, onAddManualItemClick }) {
  const cartTotal = pos.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <>
      <div className="cart-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Pesanan</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-icon" onClick={onAddManualItemClick} title="Input Barang Manual"><PlusCircle size={20} /></button>
            <button className="btn-icon" onClick={pos.clearCart} title="Kosongkan Keranjang"><Trash2 size={20} /></button>
          </div>
        </div>

        {/* Pemilihan Kasir Bertugas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            <User size={12} /> Kasir:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'var(--background)', padding: '3px', borderRadius: '10px', border: '1.5px solid var(--border)' }}>
            {['Ami Azzam', 'Ami Muhajir'].map(name => {
              const isActive = cashierName === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onCashierChange?.(name)}
                  style={{
                    padding: '7px 8px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? '700' : '500',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text)',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  {isActive && <Check size={13} strokeWidth={3} />}
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Nama Pembeli */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="text" placeholder="Nama Pembeli" value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            style={{
              fontSize: '0.85rem',
              padding: '8px 12px',
              width: '100%',
              borderRadius: '10px',
              border: '1.5px solid var(--border)',
              background: 'var(--background)',
              fontWeight: '500',
            }}
          />
        </div>
      </div>

      <div className="cart-items">
        {pos.cart.length === 0
          ? <div className="empty-state"><p>Keranjang kosong</p></div>
          : pos.cart.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.image || defaultImage(item.name)} alt={item.name} className="cart-item-img" />
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">{formatCurrency(item.price)}</div>
              </div>
              <div className="cart-item-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--background)', borderRadius: '6px', padding: '2px' }}>
                  <button className="cart-qty-btn" onClick={() => pos.updateQuantity(item.id, -1)} style={{ width: '24px', height: '24px' }}><Minus size={12} /></button>
                  <span style={{ fontSize: '0.85rem', width: '20px', textAlign: 'center', fontWeight: '600' }}>{item.quantity}</span>
                  <button className="cart-qty-btn" onClick={() => pos.updateQuantity(item.id,  1)} style={{ width: '24px', height: '24px' }}><Plus  size={12} /></button>
                </div>
                <button className="btn-icon" onClick={() => pos.removeFromCart(item.id)} style={{ color: 'var(--danger)', padding: '4px' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        }
      </div>

      <div className="cart-footer">
        <div className="cart-summary-row"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
        <div className="cart-summary-row"><span>Pajak (0%)</span><span>Rp 0</span></div>
        <div className="cart-summary-row cart-total"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
        <button className="btn btn-primary checkout-btn" disabled={pos.cart.length === 0} onClick={onCheckout}>
          <CreditCard size={20} /> Bayar {formatCurrency(cartTotal)}
        </button>
      </div>
    </>
  );
}

// ── CheckoutModal ─────────────────────────────────────────────────────────────
function CheckoutModal({ total, customerName, cashierName, onClose, onCheckout }) {
  const [amountPaidRaw, setAmountPaidRaw] = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [isLoading,     setIsLoading]     = useState(false);

  const parseAmount  = (str) => parseInt(str.replace(/\./g, ''), 10) || 0;
  const formatAmount = (num) => num === 0 ? '' : num.toLocaleString('id-ID');

  const amountPaid = parseAmount(amountPaidRaw);
  const change     = amountPaid - total;

  const handleAmountInput = (e) => {
    const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    setAmountPaidRaw(formatAmount(num));
    setErrorMsg('');
  };

  const handleQuickAmount = (amount) => {
    setAmountPaidRaw(formatAmount(amount));
    setErrorMsg('');
  };

  const quickAmounts = (() => {
    const base = [5000, 10000, 20000, 50000, 100000, 200000, 500000];
    const idx  = base.findIndex(v => v >= total);
    const start = idx === -1 ? base.length - 5 : Math.max(0, idx);
    return base.slice(start, start + 5);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await onCheckout(amountPaid);
    setIsLoading(false);
    if (result && !result.success) setErrorMsg(result.message || 'Terjadi kesalahan.');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content checkout-modal">
        <div className="checkout-modal-header">
          <div>
            <h2>Konfirmasi Pembayaran</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <span>Kasir: <strong>{cashierName || 'Ami Azzam'}</strong></span>
              <span>•</span>
              <span>Pembeli: <strong>{customerName || 'santri'}</strong></span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }}><X size={24} /></button>
        </div>

        <div className="checkout-total-box">
          <div className="checkout-total-label">Total Belanja</div>
          <div className="checkout-total-value">{formatCurrency(total)}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Bayar Cepat</label>
            <div className="quick-amounts">
              {quickAmounts.map(amt => (
                <button key={amt} type="button" className={`quick-amount-btn ${amountPaid === amt ? 'active' : ''}`} onClick={() => handleQuickAmount(amt)}>
                  {formatCurrency(amt)}
                </button>
              ))}
              <button type="button" className={`quick-amount-btn exact ${amountPaid === total ? 'active' : ''}`} onClick={() => handleQuickAmount(total)}>Pas</button>
            </div>
          </div>

          <div className="form-group">
            <label>Jumlah Bayar</label>
            <div className="amount-input-wrapper">
              <span className="currency-prefix">Rp</span>
              <input type="text" inputMode="numeric" value={amountPaidRaw} onChange={handleAmountInput} placeholder="0" autoFocus className="amount-input" />
            </div>
            {errorMsg && <div className="input-error">{errorMsg}</div>}
          </div>

          <div className={`change-display ${change >= 0 && amountPaid > 0 ? 'positive' : ''} ${change < 0 && amountPaid > 0 ? 'negative' : ''}`}>
            <div className="change-label">Kembalian</div>
            <div className="change-value">
              {amountPaid === 0 ? '—'
                : change < 0 ? <span style={{ color: 'var(--danger)' }}>Kurang {formatCurrency(Math.abs(change))}</span>
                : formatCurrency(change)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={isLoading}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
              {isLoading ? 'Memproses...' : amountPaid < total ? 'Simpan Kasbon' : 'Konfirmasi Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TransactionSuccessModal ───────────────────────────────────────────────────
function TransactionSuccessModal({ transaction, offlineMode, onClose }) {
  const [copied, setCopied] = useState(false);

  const generateWaText = () => {
    const date = new Date(transaction.date);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isKasbon = transaction.amountPaid < transaction.total;
    const changeText = isKasbon 
      ? `*Sisa Tagihan (Kasbon):* Rp ${(transaction.total - transaction.amountPaid).toLocaleString('id-ID')}`
      : `*Kembalian:* Rp ${transaction.change.toLocaleString('id-ID')}`;

    const itemsText = transaction.items.map((item) => {
      return `• *${item.name}*\n  ${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}  ➔  *Rp ${(item.price * item.quantity).toLocaleString('id-ID')}*`;
    }).join('\n');

    return `*☕ MA'HAD IBNU ABBAS - MAQSHOF ☕*
----------------------------------------
📝 *No. Transaksi:* \`${transaction.id}\`
📅 *Tanggal:* ${dateStr}, ${timeStr}
👨‍💼 *Kasir:* *${transaction.cashierName || 'Ami Azzam'}*
👤 *Pembeli:* *${transaction.customerName || 'santri'}*
----------------------------------------

🛒 *RINCIAN BELANJA:*
${itemsText}

----------------------------------------
💰 *TOTAL:* *Rp ${transaction.total.toLocaleString('id-ID')}*
💵 *Bayar:* Rp ${transaction.amountPaid.toLocaleString('id-ID')}
🪙 ${changeText}
----------------------------------------

✨ *Terima kasih atas pembelian Anda!*
_Barakallahu fiikum_`;
  };

  const handleCopyText = () => {
    const text = generateWaText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Gagal menyalin teks: ', err);
    });
  };

  const handlePrintPdf = () => {
    const date = new Date(transaction.date);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isKasbon = transaction.amountPaid < transaction.total;

    const printContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Struk - ${transaction.id}</title>
        <style>
          @page { margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 58mm;
            max-width: 100%;
            background: #fff;
            color: #000;
            margin: 0 auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            padding: 4mm 2mm;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .logo-name { font-size: 14px; font-weight: bold; margin: 4px 0 2px; letter-spacing: 1px; }
          .sub-name { font-size: 10px; margin-bottom: 4px; }
          .txn-id { font-size: 9px; color: #333; margin-bottom: 2px; }
          .item-row { display: flex; flex-direction: column; margin: 4px 0; }
          .item-name { font-weight: bold; }
          .item-detail-row { display: flex; justify-content: space-between; }
          .item-subtotal { font-weight: bold; }
          .summary-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .summary-row.total { font-size: 13px; font-weight: bold; margin-top: 6px; }
          .status-kasbon { background: #f0f0f0; padding: 4px 6px; border: 1px dashed #333; border-radius: 4px; margin: 6px 0; text-align: center; font-weight: bold; }
          .footer { margin-top: 10px; font-size: 9px; color: #333; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="logo-name">MA'HAD IBNU ABBAS</div>
          <div class="sub-name">Ibnu Abbas - Maqshof</div>
          <div class="txn-id">${transaction.id}</div>
          <div class="txn-id">${dateStr} ${timeStr}</div>
          <div class="txn-id">Kasir: <strong>${transaction.cashierName || 'Ami Azzam'}</strong></div>
          <div class="txn-id">Pembeli: <strong>${transaction.customerName || 'santri'}</strong></div>
        </div>

        <div class="divider"></div>

        ${transaction.items.map(item => `
          <div class="item-row">
            <div class="bold">${item.name}</div>
            <div class="item-detail-row">
              <span>${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}</span>
              <span class="bold">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
            </div>
          </div>
        `).join('')}

        <div class="divider"></div>

        <div class="summary-row total">
          <span>TOTAL</span><span>Rp ${transaction.total.toLocaleString('id-ID')}</span>
        </div>
        <div class="summary-row">
          <span>Dibayar</span><span>Rp ${transaction.amountPaid.toLocaleString('id-ID')}</span>
        </div>
        ${!isKasbon ? `
        <div class="summary-row change">
          <span>Kembalian</span><span>Rp ${transaction.change.toLocaleString('id-ID')}</span>
        </div>` : `
        <div class="status-kasbon">⚠ KASBON — Sisa: Rp ${(transaction.total - transaction.amountPaid).toLocaleString('id-ID')}</div>`}

        <div class="divider"></div>
        <div class="center footer">
          <div>Terima kasih atas pembelian Anda!</div>
          <div>Barakallahu fiikum</div>
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentDocument.write(printContent);
    iframe.contentDocument.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 500);

    iframe.contentWindow.onafterprint = () => {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content success-modal" style={{ maxWidth: '460px' }}>
        <div className="success-icon-wrapper">
          <div className="success-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2>Transaksi Berhasil!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pembayaran telah dikonfirmasi</p>
          {offlineMode && (
            <div style={{ marginTop: '8px', padding: '6px 14px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
              ⚠ Mode Offline — data tersimpan lokal
            </div>
          )}
        </div>

        {/* E-Bill Visual Box */}
        <div className="txn-receipt">
          <div className="receipt-header">
            <span className="receipt-id">{transaction.id}</span>
            <span className="receipt-date">{new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="receipt-items">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="receipt-item">
                <span className="receipt-item-name">{item.name}</span>
                <span className="receipt-item-qty">x{item.quantity}</span>
                <span className="receipt-item-price">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="receipt-divider" />
          <div className="receipt-summary">
            <div className="receipt-row"><span>Kasir</span><span><strong>{transaction.cashierName || 'Ami Azzam'}</strong></span></div>
            <div className="receipt-row"><span>Pembeli</span><span><strong>{transaction.customerName || 'santri'}</strong></span></div>
            <div className="receipt-row"><span>Total Belanja</span><span><strong>{formatCurrency(transaction.total)}</strong></span></div>
            <div className="receipt-row"><span>Dibayar</span><span>{formatCurrency(transaction.amountPaid)}</span></div>
            <div className="receipt-row change-row">
              <span>{transaction.amountPaid < transaction.total ? 'Sisa Tagihan' : 'Kembalian'}</span>
              <span className="change-highlight">
                {transaction.amountPaid < transaction.total 
                  ? formatCurrency(transaction.total - transaction.amountPaid)
                  : formatCurrency(transaction.change)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`btn ${copied ? 'btn-success' : 'btn-outline'}`}
              style={{ flex: 1, gap: '8px', justifyContent: 'center', transition: 'all 0.2s ease', borderColor: copied ? 'var(--secondary)' : 'var(--border)' }}
              onClick={handleCopyText}
            >
              {copied ? <Check size={18} color="white" /> : <Copy size={18} />}
              {copied ? 'Teks Tersalin!' : 'Salin Format WA'}
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1, gap: '8px', justifyContent: 'center' }}
              onClick={handlePrintPdf}
            >
              <Printer size={18} />
              Cetak PDF
            </button>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onClose}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ManualItemModal ───────────────────────────────────────────────────────────
function ManualItemModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [priceRaw, setPriceRaw] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handlePriceInput = (e) => {
    const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    setPriceRaw(num === 0 ? '' : num.toLocaleString('id-ID'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const price = parseInt(priceRaw.replace(/\D/g, ''), 10) || 0;
    
    onAdd({
      id: `manual-${Date.now()}`,
      name: name.trim() + ' (Manual)',
      price,
      stock: Infinity,
      is_manual: true,
      quantity
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Input Barang Manual</h2>
          <button className="btn-icon" onClick={onClose} style={{ padding: 0 }}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nama Barang / Jasa</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Contoh: Ongkos Kirim" 
              required 
              autoFocus 
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Harga Satuan</label>
            <div className="amount-input-wrapper">
              <span className="currency-prefix">Rp</span>
              <input 
                type="text" 
                inputMode="numeric" 
                value={priceRaw} 
                onChange={handlePriceInput} 
                placeholder="0" 
                required 
                className="amount-input" 
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Jumlah</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', minWidth: '30px', textAlign: 'center' }}>{quantity}</span>
              <button type="button" className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>Tambahkan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
