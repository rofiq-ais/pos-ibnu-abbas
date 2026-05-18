// ── Shared utilities & components ────────────────────────────────────────────

export const defaultImage = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;

export function getTimeframeLabel(timeframe, customDate) {
  if (timeframe === 'today')        return 'Hari Ini';
  if (timeframe === 'month')        return 'Bulan Ini';
  if (timeframe === 'year')         return 'Tahun Ini';
  if (timeframe === 'custom_date')  return customDate || 'Tanggal';
  if (timeframe === 'custom_month') return customDate || 'Bulan';
  return 'Keseluruhan';
}

export function TimeframeFilter({ timeframe, setTimeframe, customDate, setCustomDate }) {
  return (
    <div className="timeframe-selector" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
      <button className={`time-btn ${timeframe === 'today'  ? 'active' : ''}`} onClick={() => setTimeframe('today')}>Hari Ini</button>
      <button className={`time-btn ${timeframe === 'month'  ? 'active' : ''}`} onClick={() => setTimeframe('month')}>Bulan Ini</button>
      <button className={`time-btn ${timeframe === 'year'   ? 'active' : ''}`} onClick={() => setTimeframe('year')}>Tahun Ini</button>
      <button className={`time-btn ${timeframe === 'all'    ? 'active' : ''}`} onClick={() => setTimeframe('all')}>Semua</button>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
        <input
          type="date"
          value={timeframe === 'custom_date' ? customDate : ''}
          onChange={(e) => { setTimeframe('custom_date'); setCustomDate(e.target.value); }}
          title="Pilih Tanggal"
        />
        <input
          type="month"
          value={timeframe === 'custom_month' ? customDate : ''}
          onChange={(e) => { setTimeframe('custom_month'); setCustomDate(e.target.value); }}
          title="Pilih Bulan"
        />
      </div>
    </div>
  );
}
