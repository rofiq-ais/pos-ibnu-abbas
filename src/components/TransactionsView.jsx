import { useState } from 'react';
import { History, Eye, ChevronUp, ChevronDown, Download, X, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { formatDate, formatCurrency, filterByTimeframe, exportToCSV } from '../utils';
import { TimeframeFilter, defaultImage } from './Shared';

// ── TransactionsView ──────────────────────────────────────────────────────────
export function TransactionsView({ pos }) {
  const [expandedId,       setExpandedId]       = useState(null);
  const [timeframe,        setTimeframe]        = useState('all');
  const [customDate,       setCustomDate]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all'); // 'all' | 'lunas' | 'kasbon'
  const [kasbonPaymentTxn, setKasbonPaymentTxn] = useState(null);
  const [refundTxn,        setRefundTxn]        = useState(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const byTimeframe = filterByTimeframe(pos.transactions, 'date', timeframe, customDate);
  const filteredTransactions = byTimeframe.filter(t => {
    if (statusFilter === 'lunas')  return t.amountPaid >= t.total;
    if (statusFilter === 'kasbon') return t.amountPaid < t.total;
    return true;
  });

  const csvData = filteredTransactions.map(t => ({
    ID: t.id,
    Tanggal: new Date(t.date).toLocaleString('id-ID'),
    Pembeli: t.customerName || 'santri',
    Total: t.total,
    Dibayar: t.amountPaid,
    Kembalian: t.change,
    Items: JSON.stringify(t.items.map(i => `${i.name} x${i.quantity}`))
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Riwayat Transaksi</h2>
        <button
          className="btn btn-outline"
          onClick={() => exportToCSV(csvData, `Transaksi_POS_${timeframe}_${Date.now()}.csv`)}
          disabled={filteredTransactions.length === 0}
        >
          <Download size={18} /> Export Excel (CSV)
        </button>
      </div>

      <TimeframeFilter timeframe={timeframe} setTimeframe={setTimeframe} customDate={customDate} setCustomDate={setCustomDate} />

      {/* Status Filter */}
      <div className="status-filter-bar">
        {[['all', 'Semua'], ['lunas', '✓ Lunas'], ['kasbon', '⚠ Kasbon']].map(([val, label]) => (
          <button
            key={val}
            className={`status-filter-btn ${statusFilter === val ? 'active-' + val : ''}`}
            onClick={() => setStatusFilter(val)}
          >
            {label}
            {val !== 'all' && (
              <span className="status-filter-count">
                {byTimeframe.filter(t => val === 'lunas' ? t.amountPaid >= t.total : t.amountPaid < t.total).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state"><History size={48} /><p>Belum ada transaksi pada periode ini.</p></div>
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
                {filteredTransactions.map(txn => {
                  const isExpanded  = expandedId === txn.id;
                  const totalItems  = txn.items.reduce((s, i) => s + i.quantity, 0);
                  const isKasbon    = txn.amountPaid < txn.total;
                  const hasRefund   = txn.refundTotal > 0;
                  return (
                    <>
                      <tr key={txn.id} className="txn-row" onClick={() => toggleExpand(txn.id)}>
                        <td data-label="ID Transaksi" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {txn.id}
                          {hasRefund && <span className="refund-pill">↩ Refund</span>}
                        </td>
                        <td data-label="Pembeli"      style={{ fontWeight: '500' }}>{txn.customerName || 'santri'}</td>
                        <td data-label="Tanggal">{formatDate(txn.date)}</td>
                        <td data-label="Items">{totalItems} item</td>
                        <td data-label="Total" style={{ fontWeight: '600' }}>{formatCurrency(txn.total)}</td>
                        <td data-label="Status">
                          {isKasbon
                            ? <span style={{ backgroundColor: '#fef2f2', color: 'var(--danger)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Kasbon</span>
                            : <span className="badge-success">Lunas</span>
                          }
                        </td>
                        <td data-label="Detail">
                          <button className="txn-toggle" onClick={e => { e.stopPropagation(); toggleExpand(txn.id); }}>
                            <Eye size={16} />
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr key={`${txn.id}-detail`} className="txn-detail-row">
                          <td colSpan="7">
                            <div className="txn-detail-content">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4>Detail Pesanan</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pembeli: <strong>{txn.customerName || 'santri'}</strong></div>
                              </div>

                              {/* Item list */}
                              <div className="txn-detail-items">
                                {txn.items.map((item, idx) => {
                                  const refunded = txn.refundedItems?.find(r => r.id === item.id);
                                  return (
                                    <div key={idx} className={`txn-detail-item ${refunded ? 'item-refunded' : ''}`}>
                                      <img src={item.image || defaultImage(item.name)} alt={item.name} />
                                      <div className="txn-detail-item-info">
                                        <div className="txn-detail-item-name">{item.name}</div>
                                        <div className="txn-detail-item-qty">{item.quantity} x {formatCurrency(item.price)}</div>
                                        {refunded && (
                                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                                            ↩ Refund: {refunded.quantity} unit
                                          </div>
                                        )}
                                      </div>
                                      <div className="txn-detail-item-subtotal">{formatCurrency(item.price * item.quantity)}</div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Summary boxes */}
                              <div className="txn-summary-grid">
                                <div className="txn-summary-box"><div className="label">Total</div>      <div className="value">{formatCurrency(txn.total)}</div></div>
                                <div className="txn-summary-box"><div className="label">Dibayar</div>    <div className="value">{formatCurrency(txn.amountPaid)}</div></div>
                                <div className="txn-summary-box"><div className="label">Kembalian</div>  <div className="value">{formatCurrency(txn.change)}</div></div>
                                <div className="txn-summary-box"><div className="label">Total Item</div> <div className="value">{totalItems}</div></div>
                                {hasRefund && (
                                  <div className="txn-summary-box" style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
                                    <div className="label" style={{ color: 'var(--danger)' }}>Total Refund</div>
                                    <div className="value" style={{ color: 'var(--danger)' }}>-{formatCurrency(txn.refundTotal)}</div>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons row */}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                                {/* Kasbon payment */}
                                {isKasbon && (
                                  <div style={{ flex: 1, minWidth: '200px', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fecaca' }}>
                                    <div>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>Sisa Tagihan (Kasbon)</div>
                                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(txn.total - txn.amountPaid)}</div>
                                    </div>
                                    <button className="btn btn-danger" onClick={e => { e.stopPropagation(); setKasbonPaymentTxn(txn); }}>
                                      Bayar Cicilan
                                    </button>
                                  </div>
                                )}

                                {/* Refund button */}
                                <button
                                  className="btn btn-refund"
                                  onClick={e => { e.stopPropagation(); setRefundTxn(txn); }}
                                >
                                  <RotateCcw size={16} /> Refund Barang
                                </button>
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

      {/* Kasbon Payment Modal */}
      {kasbonPaymentTxn && (
        <KasbonPaymentModal
          txn={kasbonPaymentTxn}
          onClose={() => setKasbonPaymentTxn(null)}
          onPay={async (amount) => {
            await pos.payKasbon(kasbonPaymentTxn.id, amount);
            setKasbonPaymentTxn(null);
          }}
        />
      )}

      {/* Refund Modal */}
      {refundTxn && (
        <RefundModal
          txn={refundTxn}
          onClose={() => setRefundTxn(null)}
          onRefund={async (refundItems) => {
            const result = await pos.refundTransaction(refundTxn.id, refundItems);
            if (result.success) setRefundTxn(null);
            return result;
          }}
        />
      )}
    </div>
  );
}

// ── KasbonPaymentModal ────────────────────────────────────────────────────────
function KasbonPaymentModal({ txn, onClose, onPay }) {
  const [amountRaw,    setAmountRaw]    = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sisa         = txn.total - txn.amountPaid;
  const parseAmount  = (str) => parseInt(str.replace(/\D/g, ''), 10) || 0;
  const formatAmount = (num) => num === 0 ? '' : num.toLocaleString('id-ID');

  const handleInput  = (e) => setAmountRaw(formatAmount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0));
  const amount       = parseAmount(amountRaw);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount <= 0) return;
    setIsSubmitting(true);
    await onPay(amount);
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '350px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>Pembayaran Kasbon</h2>
          <button className="btn-icon" onClick={onClose} style={{ padding: 0 }}><X size={24} /></button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Sisa Tagihan</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>{formatCurrency(sisa)}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nominal Pembayaran</label>
            <div className="amount-input-wrapper">
              <span className="currency-prefix">Rp</span>
              <input type="text" inputMode="numeric" value={amountRaw} onChange={handleInput} placeholder="0" autoFocus className="amount-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={isSubmitting}>Batal</button>
            <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={amount <= 0 || isSubmitting}>
              {isSubmitting ? 'Memproses...' : 'Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── RefundModal ───────────────────────────────────────────────────────────────
function RefundModal({ txn, onClose, onRefund }) {
  // Hitung qty yang belum di-refund untuk setiap item
  const getAvailableQty = (item) => {
    const alreadyRefunded = txn.refundedItems?.find(r => r.id === item.id)?.quantity || 0;
    return item.quantity - alreadyRefunded;
  };

  const [selected, setSelected] = useState(() => {
    // default: semua item yang masih bisa di-refund
    const init = {};
    txn.items.forEach(item => {
      const avail = getAvailableQty(item);
      if (avail > 0) init[item.id] = avail;
    });
    return init;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');

  const toggleItem = (item) => {
    setSelected(prev => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: getAvailableQty(item) };
    });
  };

  const setQty = (itemId, val, max) => {
    const n = Math.max(1, Math.min(max, parseInt(val) || 1));
    setSelected(prev => ({ ...prev, [itemId]: n }));
  };

  const selectAll = () => {
    const init = {};
    txn.items.forEach(item => {
      const avail = getAvailableQty(item);
      if (avail > 0) init[item.id] = avail;
    });
    setSelected(init);
  };

  const refundTotal = txn.items.reduce((sum, item) => {
    const qty = selected[item.id] || 0;
    return sum + item.price * qty;
  }, 0);

  const handleSubmit = async () => {
    const refundItems = txn.items
      .filter(item => selected[item.id] > 0)
      .map(item => ({ id: item.id, name: item.name, price: item.price, quantity: selected[item.id], image: item.image || '' }));

    if (refundItems.length === 0) { setError('Pilih minimal 1 item untuk di-refund.'); return; }

    setIsSubmitting(true);
    const result = await onRefund(refundItems);
    setIsSubmitting(false);
    if (!result.success) setError(result.message || 'Terjadi kesalahan.');
  };

  const refundableItems = txn.items.filter(item => getAvailableQty(item) > 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content refund-modal">
        {/* Header */}
        <div className="refund-modal-header">
          <div>
            <h2>Refund Barang</h2>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Transaksi: <span style={{ fontFamily: 'monospace' }}>{txn.id}</span>
              {' · '}{txn.customerName || 'santri'}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ padding: 0 }}><X size={24} /></button>
        </div>

        {refundableItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <RotateCcw size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Semua item dalam transaksi ini sudah di-refund.</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Pilih item yang akan dikembalikan:
              </span>
              <button className="btn-text" onClick={selectAll}>Pilih Semua</button>
            </div>

            {/* Item list */}
            <div className="refund-item-list">
              {refundableItems.map(item => {
                const avail   = getAvailableQty(item);
                const checked = !!selected[item.id];
                return (
                  <div
                    key={item.id}
                    className={`refund-item-row ${checked ? 'selected' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className="refund-item-check">
                      {checked ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-muted)" />}
                    </div>
                    <img src={item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff&size=200`} alt={item.name} className="refund-item-img" />
                    <div className="refund-item-info">
                      <div className="refund-item-name">{item.name}</div>
                      <div className="refund-item-price">{formatCurrency(item.price)} / unit</div>
                    </div>
                    <div className="refund-item-qty-block" onClick={e => e.stopPropagation()}>
                      {checked && (
                        <div className="refund-qty-control">
                          <button
                            className="refund-qty-btn"
                            onClick={() => setQty(item.id, (selected[item.id] || 1) - 1, avail)}
                            disabled={(selected[item.id] || 1) <= 1}
                          >−</button>
                          <span className="refund-qty-val">{selected[item.id]}</span>
                          <button
                            className="refund-qty-btn"
                            onClick={() => setQty(item.id, (selected[item.id] || 1) + 1, avail)}
                            disabled={(selected[item.id] || 1) >= avail}
                          >+</button>
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                        Maks: {avail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total refund */}
            <div className="refund-total-box">
              <span>Total Refund</span>
              <strong style={{ color: 'var(--danger)', fontSize: '1.2rem' }}>{formatCurrency(refundTotal)}</strong>
            </div>

            {error && <div className="input-error" style={{ marginBottom: '8px' }}>⚠ {error}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={isSubmitting}>Batal</button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={isSubmitting || refundTotal === 0}
              >
                {isSubmitting ? 'Memproses...' : '↩ Konfirmasi Refund'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
