import { useState } from 'react';
import { Minus, Plus, Wallet, ArrowDownCircle, ArrowUpCircle, X, Download } from 'lucide-react';
import { formatDate, formatCurrency, filterByTimeframe, exportToCSV } from '../utils';
import { TimeframeFilter } from './Shared';

// ── CashFlowView ──────────────────────────────────────────────────────────────
export function CashFlowView({ pos }) {
  const [modalType, setModalType] = useState(null); // null | 'IN' | 'OUT'
  const [timeframe, setTimeframe] = useState('all');
  const [customDate, setCustomDate] = useState('');

  const filteredCashFlow = filterByTimeframe(pos.cashFlow, 'created_at', timeframe, customDate);

  const totalIn    = filteredCashFlow.filter(c => c.type === 'IN').reduce((s, c) => s + c.amount, 0);
  const totalOut   = filteredCashFlow.filter(c => c.type === 'OUT').reduce((s, c) => s + c.amount, 0);
  const netBalance = totalIn - totalOut;

  const csvData = filteredCashFlow.map(c => ({
    ID:         c.id,
    Tanggal:    new Date(c.created_at).toLocaleString('id-ID'),
    Tipe:       c.type === 'IN' ? 'MASUK' : 'KELUAR',
    Kategori:   c.category,
    Keterangan: c.description || '-',
    Nominal:    c.amount,
  }));

  return (
    <div className="cashflow-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ringkasan Arus Kas</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => exportToCSV(csvData, `ArusKas_POS_${timeframe}_${Date.now()}.csv`)} disabled={filteredCashFlow.length === 0}>
            <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-success" onClick={() => setModalType('IN')} style={{ gap: '8px' }}>
            <Plus size={18} /> Tambah Pemasukan
          </button>
          <button className="btn btn-danger" onClick={() => setModalType('OUT')} style={{ gap: '8px' }}>
            <Minus size={18} /> Tambah Pengeluaran
          </button>
        </div>
      </div>

      <TimeframeFilter timeframe={timeframe} setTimeframe={setTimeframe} customDate={customDate} setCustomDate={setCustomDate} />

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ECFDF5', color: 'var(--secondary)' }}><ArrowDownCircle size={24} /></div>
          <div className="stat-info"><span className="stat-label">Total Masuk (IN)</span><h3 className="stat-value" style={{ color: 'var(--secondary)' }}>{formatCurrency(totalIn)}</h3></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEF2F2', color: 'var(--danger)' }}><ArrowUpCircle size={24} /></div>
          <div className="stat-info"><span className="stat-label">Total Keluar (OUT)</span><h3 className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalOut)}</h3></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#EEF2FF', color: 'var(--primary)' }}><Wallet size={24} /></div>
          <div className="stat-info"><span className="stat-label">Saldo Bersih</span><h3 className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(netBalance)}</h3></div>
        </div>
      </div>

      {/* Transaction table */}
      <div className="table-container">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {filteredCashFlow.length === 0 ? (
                <tr><td colSpan="5" className="empty-state" style={{ padding: '32px' }}>
                  <Wallet size={48} style={{ marginBottom: '16px', color: 'var(--border)' }} />
                  <p>Belum ada data arus kas pada periode ini.</p>
                </td></tr>
              ) : filteredCashFlow.map(cf => (
                <tr key={cf.id}>
                  <td data-label="Tanggal">{formatDate(cf.created_at)}</td>
                  <td data-label="Tipe">
                    <span style={{
                      backgroundColor: cf.type === 'IN' ? '#ecfdf5' : '#fef2f2',
                      color:           cf.type === 'IN' ? 'var(--secondary)' : 'var(--danger)',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                    }}>
                      {cf.type === 'IN' ? 'MASUK' : 'KELUAR'}
                    </span>
                  </td>
                  <td data-label="Kategori">{cf.category}</td>
                  <td data-label="Keterangan">{cf.description || '-'}</td>
                  <td data-label="Nominal" style={{ fontWeight: '600', color: cf.type === 'IN' ? 'var(--secondary)' : 'var(--danger)' }}>
                    {cf.type === 'IN' ? '+' : '-'}{formatCurrency(cf.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Add Income / Expense Modal */}
      {modalType && (
        <AddCashFlowModal 
          pos={pos} 
          initialType={modalType} 
          onClose={() => setModalType(null)} 
        />
      )}
    </div>
  );
}

// ── AddCashFlowModal ──────────────────────────────────────────────────────────
function AddCashFlowModal({ pos, initialType, onClose }) {
  const [type, setType] = useState(initialType); // 'IN' or 'OUT'
  const [category, setCategory] = useState(initialType === 'IN' ? 'Suntikan Dana' : 'Bahan Baku');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically switch category selection list when type switches
  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'IN' ? 'Suntikan Dana' : 'Bahan Baku');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    setIsSubmitting(true);
    await pos.addCashFlow({ 
      type, 
      category, 
      amount: parseInt(amount, 10), 
      description 
    });
    setIsSubmitting(false);
    onClose();
  };

  const categories = type === 'IN' 
    ? ['Suntikan Dana', 'Hasil SO (Lebih Stok)', 'Penjualan Lainnya', 'Lain-lain']
    : ['Bahan Baku', 'Gaji Pegawai', 'Listrik/Air', 'Sewa Tempat', 'Lain-lain'];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <h2>Catat Arus Kas</h2>
          <button className="btn-icon" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Premium Tab Selector inside Modal */}
        <div style={{ display: 'flex', background: 'var(--background)', padding: '4px', borderRadius: '8px', marginBottom: '20px' }}>
          <button 
            type="button"
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              backgroundColor: type === 'IN' ? 'var(--secondary)' : 'transparent',
              color: type === 'IN' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
            onClick={() => handleTypeChange('IN')}
          >
            📥 Pemasukan (IN)
          </button>
          <button 
            type="button"
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              backgroundColor: type === 'OUT' ? 'var(--danger)' : 'transparent',
              color: type === 'OUT' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
            onClick={() => handleTypeChange('OUT')}
          >
            📤 Pengeluaran (OUT)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Nominal (Rp)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0" 
              min="1" 
              required 
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} 
            />
          </div>
          <div className="form-group">
            <label>Keterangan</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Contoh: Suntikan modal awal, Lebih stok SO" 
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Batal</button>
            <button 
              type="submit"  
              className={`btn ${type === 'IN' ? 'btn-success' : 'btn-danger'}`}  
              style={{ flex: 1, justifyContent: 'center' }} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
