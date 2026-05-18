import { useState } from 'react';
import { DollarSign, TrendingUp, PieChart, Activity, ShoppingBag, Package, BarChart3, Clock, FileText } from 'lucide-react';
import { formatCurrency, filterByTimeframe, generatePDFSummary } from '../utils';
import { TimeframeFilter, getTimeframeLabel } from './Shared';

export function DashboardView({ pos, setActiveTab }) {
  const [timeframe, setTimeframe] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const stats    = pos.getDashboardStats(timeframe, customDate);
  const tfLabel  = getTimeframeLabel(timeframe, customDate);
  const cashFlow = pos.cashFlow ? filterByTimeframe(pos.cashFlow, 'created_at', timeframe, customDate) : [];

  return (
    <div className="dashboard-layout">

      {/* Controls row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <TimeframeFilter
          timeframe={timeframe} setTimeframe={setTimeframe}
          customDate={customDate} setCustomDate={setCustomDate}
        />
        <button
          className="btn btn-primary"
          style={{ marginBottom: '24px' }}
          onClick={() => generatePDFSummary(stats, cashFlow, tfLabel)}
        >
          <FileText size={18} /> Download Ringkasan (PDF)
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="stats-grid">
        <StatCard icon={<DollarSign size={24} />} bg="#EEF2FF" color="var(--primary)"  label={`Pendapatan ${tfLabel}`} value={formatCurrency(stats.revenue)} />
        <StatCard icon={<TrendingUp size={24} />} bg="#ECFDF5" color="var(--secondary)" label={`Laba Bersih ${tfLabel}`} value={formatCurrency(stats.profit)} valueColor="var(--secondary)" />
        <StatCard icon={<PieChart size={24} />}   bg="#F3E8FF" color="#9333EA"          label="Margin Profit"            value={`${stats.profitMargin}%`}     valueColor="#9333EA" />
        <StatCard icon={<Activity size={24} />}   bg="#E0F2FE" color="#0284C7"          label="Rata-rata Order (AOV)"   value={formatCurrency(stats.aov)} />
        <StatCard icon={<ShoppingBag size={24} />} bg="#FFFBEB" color="#D97706"         label="Total Transaksi"          value={stats.transactionCount} />
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)' }}><Package size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Stok Menipis</span>
            <h3 className="stat-value">{stats.lowStockCount}</h3>
            {stats.lowStockCount > 0 && <div className="stat-trend negative"><span>Segera Restock</span></div>}
          </div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="dashboard-charts-grid">

        {/* Top Products */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Produk Terlaris</h3>
            <button className="btn-text" onClick={() => setActiveTab('products')}>Lihat Semua</button>
          </div>
          <div className="top-products-list">
            {stats.topProducts.length === 0 ? (
              <div className="empty-state" style={{ minHeight: '150px' }}><p>Belum ada data penjualan.</p></div>
            ) : stats.topProducts.map((p, idx) => {
              const pct = (p.quantity / (stats.topProducts[0]?.quantity || 1)) * 100;
              return (
                <div key={idx} className="top-product-item">
                  <div className="product-rank">{idx + 1}</div>
                  <div className="product-details">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="product-name">{p.name}</span>
                      <span className="product-qty">{p.quantity} terjual</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Category Analysis */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Analisis Kategori</h3>
              <BarChart3 size={20} color="var(--text-muted)" />
            </div>
            <div className="category-sales-list">
              {stats.categorySales.length === 0
                ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Belum ada data.</p>
                : stats.categorySales.map((cat, idx) => {
                  const pct = (cat.revenue / (stats.revenue || 1)) * 100;
                  return (
                    <div key={idx} className="category-item">
                      <div className="category-info">
                        <span className="category-name">{cat.category || 'Lainnya'}</span>
                        <span className="category-revenue">{formatCurrency(cat.revenue)}</span>
                      </div>
                      <div className="progress-bar-container" style={{ height: '6px', backgroundColor: '#F3F4F6' }}>
                        <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: 'var(--secondary)' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Peak Hour Card */}
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, var(--primary), #6366F1)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Clock size={28} opacity={0.8} />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Jam Sibuk</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Waktu transaksi terbanyak</p>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {stats.peakHour} <span style={{ fontSize: '1rem', fontWeight: 'normal', opacity: 0.8 }}>({stats.peakHourCount} order)</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Small helper to reduce repetition in the stats grid
function StatCard({ icon, bg, color, label, value, valueColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: bg, color }}>{icon}</div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <h3 className="stat-value" style={valueColor ? { color: valueColor } : {}}>{value}</h3>
      </div>
    </div>
  );
}
