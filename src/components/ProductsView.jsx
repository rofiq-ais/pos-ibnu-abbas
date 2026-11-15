import { useState, useRef } from 'react';
import { Search, Plus, Trash2, AlertTriangle, X, ClipboardList, Minus, Check, Camera, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { formatCurrency, compressImage } from '../utils';
import { defaultImage } from './Shared';

// ── ProductsView ──────────────────────────────────────────────────────────────
export function ProductsView({ pos, filterLowStock, setFilterLowStock }) {
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [productToDelete,setProductToDelete]= useState(null);
  const [expandedId,     setExpandedId]     = useState(null);

  // SO state — soEdits: { [productId]: number } menyimpan nilai stok aktual yang sedang di-edit
  const [soEdits,      setSoEdits]      = useState({});
  const [soSaving,     setSoSaving]     = useState({});
  const [soResult,     setSoResult]     = useState({}); // { id: diff }

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);
  const handleEdit   = (product) => { setEditingProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };

  const categories = ['All', ...new Set(pos.products.map(p => p.category))];

  const filteredProducts = pos.products.filter(p => {
    if (filterLowStock && p.stock > (p.minStock || 0)) return false;
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // SO helpers
  const getSoVal = (product) =>
    soEdits[product.id] !== undefined ? soEdits[product.id] : product.stock;

  const adjustSo = (product, delta) => {
    setSoEdits(prev => ({
      ...prev,
      [product.id]: Math.max(0, getSoVal(product) + delta),
    }));
  };

  const setSoInput = (productId, val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 0) setSoEdits(prev => ({ ...prev, [productId]: n }));
  };

  const saveSo = async (product) => {
    const actualStock = getSoVal(product);
    setSoSaving(prev => ({ ...prev, [product.id]: true }));
    const result = await pos.stockOpname(product.id, actualStock);
    setSoSaving(prev => ({ ...prev, [product.id]: false }));
    if (result.success) {
      setSoResult(prev => ({ ...prev, [product.id]: result.diff }));
      // Reset edit value (sudah tersimpan)
      setSoEdits(prev => { const n = { ...prev }; delete n[product.id]; return n; });
      // Hapus notif hasil setelah 3 detik
      setTimeout(() => setSoResult(prev => { const n = { ...prev }; delete n[product.id]; return n; }), 3000);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Daftar Produk</h2>
          <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <button 
              className={`btn ${filterLowStock ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setFilterLowStock(!filterLowStock)}
            >
              Barang Habis
            </button>
            <div className="search-input-wrapper" style={{ maxWidth: '300px', flex: 1 }}>
              <input type="text" placeholder="Cari nama atau kategori..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Category Filter */}
                <div className="category-chips" onWheel={(e) => { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }}>
          {categories.map(c => (
            <button 
              key={c} 
              className={`category-chip ${categoryFilter === c ? 'active' : ''}`}
              onClick={() => {
                  setCategoryFilter(c);
                  if (c !== 'All') {
                    setTimeout(() => {
                      const active = document.querySelector('.category-chip.active');
                      if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                    }, 0);
                  }
                }}
            >
              {c === 'All' ? 'Semua Kategori' : c}
            </button>
          ))}
        </div>
      </div>

      {/* ── SO Mode Banner ── */}
      {pos.soMode && (
        <div className="so-banner">
          <div className="so-banner-left">
            <ClipboardList size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Mode Stok Opname Aktif</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                Sesuaikan stok fisik setiap produk lalu tekan ✓ untuk menyimpan.
              </div>
            </div>
          </div>
          <button className="btn so-exit-btn" onClick={() => { pos.setSoMode(false); setSoEdits({}); setSoResult({}); }}>
            <X size={16} /> Keluar SO
          </button>
        </div>
      )}

      {/* Contact-list style product list */}
      <div className="product-list-container">
        {filteredProducts.map(product => {
          const isLowStock = product.stock <= (product.minStock || 0);
          const isExpanded = expandedId === product.id;
          const soVal      = getSoVal(product);
          const isDirty    = soEdits[product.id] !== undefined;
          const diff       = soResult[product.id];
          return (
            <div key={product.id} className={`product-list-card ${isLowStock ? 'warning' : ''}`}>

              {/* Row (always visible) */}
              <div className="product-list-header" onClick={() => !pos.soMode && toggleExpand(product.id)}>
                <img src={product.image || defaultImage(product.name)} alt={product.name} className="product-list-img" />
                <div className="product-list-main-info">
                  <div className="product-list-name">{product.name}</div>
                  <div className="product-list-category">{product.category}</div>
                  {isLowStock && <span className="stock-warning-pill" style={{ marginTop: '4px', display: 'inline-block' }}>Stok Rendah</span>}
                </div>

                {/* ── SO mode: tampilkan kontrol +/- ── */}
                {pos.soMode ? (
                  <div className="so-control" onClick={e => e.stopPropagation()}>
                    {diff !== undefined && (
                      <span className={`so-diff-badge ${diff > 0 ? 'plus' : diff < 0 ? 'minus' : 'zero'}`}>
                        {diff > 0 ? `+${diff}` : diff === 0 ? '±0' : diff}
                      </span>
                    )}
                    <div className="so-qty-row">
                      <button className="so-btn" onClick={() => adjustSo(product, -1)} disabled={soVal <= 0}>
                        <Minus size={14} />
                      </button>
                      <input
                        className="so-qty-input"
                        type="number"
                        min="0"
                        value={soVal}
                        onChange={e => setSoInput(product.id, e.target.value)}
                      />
                      <button className="so-btn" onClick={() => adjustSo(product, 1)}>
                        <Plus size={14} />
                      </button>
                      <button
                        className={`so-save-btn ${isDirty ? 'dirty' : ''}`}
                        onClick={() => saveSo(product)}
                        disabled={soSaving[product.id] || !isDirty}
                        title="Simpan stok aktual"
                      >
                        {soSaving[product.id] ? '…' : <Check size={14} />}
                      </button>
                    </div>
                    <div className="so-sys-stock">Sistem: {product.stock}</div>
                  </div>
                ) : (
                  <div className="product-list-side-info">
                    <div className="product-list-price">{formatCurrency(product.price)}</div>
                    <div className="product-list-stock" style={{ color: isLowStock ? 'var(--danger)' : 'var(--text-muted)' }}>
                      Stok: <strong>{product.stock}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded detail (hanya di non-SO mode) */}
              {!pos.soMode && isExpanded && (
                <div className="product-list-details">
                  <div className="product-detail-grid">
                    <div className="product-detail-item"><span className="label">Harga Modal</span><span className="value">{formatCurrency(product.costPrice || 0)}</span></div>
                    <div className="product-detail-item"><span className="label">Minim Stok</span><span className="value">{product.minStock || 0}</span></div>
                    <div className="product-detail-item"><span className="label">Barcode</span><span className="value">{product.barcode || '—'}</span></div>
                  </div>
                  <div className="product-detail-actions">
                    <button className="btn btn-outline" onClick={e => { e.stopPropagation(); handleEdit(product); }}><Plus size={16} /> Edit Info & Stok</button>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setProductToDelete(product); }}><Trash2 size={16} /> Hapus</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p>{searchTerm ? 'Produk tidak ditemukan.' : 'Belum ada produk.'}</p>
          </div>
        )}
      </div>

      {/* ── FAB: SO Mode toggle + Tambah produk ── */}
      {!pos.soMode && !isModalOpen && (
        <>
          {/* SO Mode Button */}
          <button
            className="fab so-fab"
            onClick={() => pos.setSoMode(true)}
            title="Stok Opname"
            style={{ right: 'auto', left: '24px' }}
          >
            <ClipboardList size={22} />
          </button>
          {/* Add product FAB */}
          <button className="fab" onClick={() => setIsModalOpen(true)} title="Tambah Produk">
            <Plus size={26} />
          </button>
        </>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <ProductModal
          editingProduct={editingProduct}
          categories={categories}
          onClose={handleCloseModal}
          onSave={(data) => {
            editingProduct ? pos.updateProduct({ ...editingProduct, ...data }) : pos.addProduct(data);
            handleCloseModal();
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {productToDelete && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ marginBottom: '8px' }}>Hapus Produk?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Anda yakin ingin menghapus produk <strong>{productToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setProductToDelete(null)}>Batal</button>
              <button className="btn btn-danger"  style={{ flex: 1 }} onClick={() => { pos.deleteProduct(productToDelete.id); setProductToDelete(null); }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ProductModal ──────────────────────────────────────────────────────────────
function ProductModal({ onClose, onSave, editingProduct, categories = [] }) {
  const [formData, setFormData] = useState({
    name:      editingProduct?.name      || '',
    category:  editingProduct?.category  || '',
    costPrice: editingProduct?.costPrice || '',
    price:     editingProduct?.price     || '',
    stock:     editingProduct ? 0 : '',
    minStock:  editingProduct?.minStock  || 0,
    image:     editingProduct?.image     || '',
    barcode:   editingProduct?.barcode   || '',
  });

  const [showCostWarning, setShowCostWarning] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressError, setCompressError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(Boolean(formData.image && formData.image.startsWith('http')));
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setCompressError('');
    try {
      const compressedDataUrl = await compressImage(file, 480, 480, 0.82);
      setFormData(prev => ({ ...prev, image: compressedDataUrl }));
    } catch (err) {
      setCompressError(err.message || 'Gagal memproses gambar');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.costPrice === '' || formData.costPrice === null || formData.costPrice === undefined) {
      setShowCostWarning(true);
      return;
    }
    proceedSave();
  };

  const proceedSave = () => {
    const numeric = { costPrice: Number(formData.costPrice) || 0, price: Number(formData.price), minStock: Number(formData.minStock) };
    if (editingProduct) {
      onSave({ ...formData, ...numeric, stock: editingProduct.stock + Number(formData.stock) });
    } else {
      onSave({ ...formData, ...numeric, stock: Number(formData.stock) });
    }
    setShowCostWarning(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2>{editingProduct ? 'Update Stok & Info' : 'Tambah Produk Baru'}</h2>
          <button onClick={onClose} className="btn-icon" style={{ padding: 0 }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Produk</label>
            <input type="text" value={formData.name} onChange={set('name')} required />
          </div>

          <div className="form-group">
            <label>Barcode</label>
            <input type="text" value={formData.barcode} onChange={set('barcode')} placeholder="Scan atau ketik kode barcode" />
          </div>

          <div className="form-group">
            <label>Kategori</label>
            <input type="text" value={formData.category} onChange={set('category')} list="category-list" required placeholder="Pilih atau ketik kategori baru" />
            <datalist id="category-list">{categories.map((c, i) => <option key={i} value={c} />)}</datalist>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Harga Modal (HPP)</label>
              <input type="number" value={formData.costPrice} onChange={set('costPrice')} min="0" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Harga Jual</label>
              <input type="number" value={formData.price} onChange={set('price')} required min="0" />
            </div>
          </div>

          <div className="form-group">
            <label>{editingProduct ? 'Tambah Stok' : 'Stok Awal'}</label>
            <input type="number" value={formData.stock} onChange={set('stock')} required min={editingProduct ? -editingProduct.stock : 0} />
            {editingProduct && <small>Stok saat ini: {editingProduct.stock}</small>}
          </div>

          <div className="form-group">
            <label>Minim Stok (Notifikasi jika di bawah ini)</label>
            <input type="number" value={formData.minStock} onChange={set('minStock')} required min="0" />
          </div>

          <div className="form-group">
            <label>Foto Produk (Opsional)</label>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginTop: '4px'
            }}>
              {/* Preview Thumbnail */}
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {formData.image ? (
                  <>
                    <img
                      src={formData.image}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      title="Hapus foto"
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <ImageIcon size={26} style={{ margin: '0 auto', display: 'block' }} />
                    <span style={{ fontSize: '10px' }}>No Foto</span>
                  </div>
                )}
              </div>

              {/* Upload Action Buttons */}
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isCompressing}
                    title="Buka kamera perangkat langsung"
                  >
                    <Camera size={14} /> Kamera
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    title="Pilih gambar dari galeri / file komputer"
                  >
                    <Upload size={14} /> File / Galeri
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 8px', fontSize: '11px', color: '#64748b' }}
                    onClick={() => setShowUrlInput(prev => !prev)}
                    title="Input URL manual"
                  >
                    <LinkIcon size={13} />
                  </button>
                </div>

                {isCompressing && (
                  <span style={{ fontSize: '11px', color: '#4f46e5', display: 'block' }}>
                    Mengompres foto...
                  </span>
                )}

                {compressError && (
                  <span style={{ fontSize: '11px', color: '#ef4444', display: 'block' }}>
                    {compressError}
                  </span>
                )}

                {showUrlInput && (
                  <div style={{ marginTop: '6px' }}>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={set('image')}
                      placeholder="Atau tempel URL: https://..."
                      style={{ width: '100%', fontSize: '12px', padding: '4px 8px' }}
                    />
                  </div>
                )}
                
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Bisa jepret foto langsung dari HP atau upload file (otomatis dikompres &lt; 40KB).
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button type="submit"  className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
          </div>
        </form>
      </div>

      {showCostWarning && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ color: 'var(--warning, #f59e0b)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ marginBottom: '8px' }}>Harga Modal Kosong</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Anda tidak mengisi Harga Modal (HPP). Apakah Anda yakin ingin mengosongkannya (dianggap Rp 0)?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCostWarning(false)}>Batal</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={proceedSave}>Yakin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
