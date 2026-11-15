import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  History,
  Package,
  Menu,
  LayoutDashboard,
  Wallet,
  X,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
} from 'lucide-react';
import { usePOS } from './hooks/usePOS';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { TransactionsView } from './components/TransactionsView';
import { ProductsView } from './components/ProductsView';
import { CashFlowView } from './components/CashFlowView';
import './index.css';

function App() {
  const [activeTab,        setActiveTab]        = useState('pos');
  const [isMenuOpen,       setIsMenuOpen]       = useState(false);
  const [filterLowStock,   setFilterLowStock]   = useState(false);
  const pos = usePOS();

  // Auto-hide error toast after 3 seconds
  useEffect(() => {
    if (pos.error) {
      const timer = setTimeout(() => {
        pos.setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pos.error, pos.setError]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const PAGE_TITLE = {
    dashboard: 'Dashboard',
    pos: 'Kasir',
    transactions: 'Riwayat Transaksi',
    products: 'Manajemen Produk',
    cashflow: 'Arus Kas',
  };

  const NAV_ITEMS = [
    { key: 'dashboard', icon: <LayoutDashboard size={24} />, iconSm: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { key: 'pos',       icon: <LayoutGrid size={24} />,       iconSm: <LayoutGrid size={20} />,       label: 'Kasir' },
    { key: 'transactions', icon: <History size={24} />,       iconSm: <History size={20} />,          label: 'Riwayat Transaksi' },
    { key: 'products',  icon: <Package size={24} />,          iconSm: <Package size={20} />,          label: 'Manajemen Produk' },
    { key: 'cashflow',  icon: <Wallet size={24} />,           iconSm: <Wallet size={20} />,           label: 'Arus Kas' },
  ];

  const lowStockCount = pos.products.filter(p => p.stock <= (p.minStock || 0)).length;

  return (
    <div className="app-container">

      {/* ── Desktop Sidebar ── */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Ibnu Abbas Maqshof" style={{ flexShrink: 0, objectFit: 'contain' }} />
          <span>Ibnu Abbas</span>
          <span>Maqshof</span>
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">

        {/* Header */}
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h1>{PAGE_TITLE[activeTab]}</h1>
          </div>

          <div className="header-date" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {lowStockCount > 0 && (
              <button
                className="low-stock-alert low-stock-alert-btn"
                title={`${lowStockCount} item stok menipis — klik untuk lihat detail`}
                onClick={() => {
                  setFilterLowStock(true);
                  setActiveTab('products');
                }}
              >
                <div className="pulse-dot" />
                <Package size={16} />
                <span>{lowStockCount} Stok Menipis</span>
              </button>
            )}
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary)', lineHeight: 1.1 }}>Ibnu Abbas</div>
                    <div style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MAQSHOF</div>
                  </div>
                </div>
                <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
              </div>
              <nav className="mobile-nav">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    className={`mobile-nav-item ${activeTab === item.key ? 'active' : ''}`}
                    onClick={() => handleTabChange(item.key)}
                  >
                    {item.iconSm}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'dashboard' && <DashboardView pos={pos} />}
          {activeTab === 'pos' && <POSView pos={pos} />}
          {activeTab === 'transactions' && <TransactionsView pos={pos} />}
          {activeTab === 'products' && <ProductsView pos={pos} filterLowStock={filterLowStock} setFilterLowStock={setFilterLowStock} />}
          {activeTab === 'cashflow' && <CashFlowView pos={pos} />}
        </div>

        {/* ── Global Error Toast ── */}
        {pos.error && (
          <div className="error-toast">
            <AlertCircle size={20} />
            <span>{pos.error}</span>
            <button onClick={() => pos.setError(null)} className="error-toast-close">
              <X size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
