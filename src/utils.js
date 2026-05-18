import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
};

export const filterByTimeframe = (data, dateField, timeframe, customDate) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return data.filter(item => {
    const itemDateStr = item[dateField];
    const itemDate = new Date(itemDateStr);
    
    if (timeframe === 'today') {
      return itemDateStr.startsWith(todayStr);
    } else if (timeframe === 'month') {
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    } else if (timeframe === 'year') {
      return itemDate.getFullYear() === currentYear;
    } else if (timeframe === 'custom_date' && customDate) {
      return itemDateStr.startsWith(customDate); // format: YYYY-MM-DD
    } else if (timeframe === 'custom_month' && customDate) {
      // format: YYYY-MM
      const [year, month] = customDate.split('-');
      return itemDate.getFullYear() === parseInt(year) && itemDate.getMonth() === parseInt(month) - 1;
    }
    return true; // 'all'
  });
};

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const separator = ',';
  const keys = Object.keys(data[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    data.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : typeof cell === 'object' ? JSON.stringify(cell).replace(/"/g, '""') : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generatePDFSummary = (stats, cashFlow, timeframeLabel) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.text('Laporan Ringkasan POS', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Periode: ${timeframeLabel}`, pageWidth / 2, 28, { align: 'center' });
  
  // Line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, 34, pageWidth - 14, 34);

  // Key Metrics
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text('Performa Penjualan', 14, 46);
  
  doc.autoTable({
    startY: 50,
    head: [['Total Pendapatan', 'Laba Bersih', 'Margin Profit', 'Total Transaksi']],
    body: [[
      formatCurrency(stats.revenue),
      formatCurrency(stats.profit),
      `${stats.profitMargin}%`,
      stats.transactionCount.toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] } // var(--primary)
  });

  // Top Products
  const currentY = doc.lastAutoTable.finalY + 10;
  doc.text('Produk Terlaris (Top 5)', 14, currentY);
  doc.autoTable({
    startY: currentY + 4,
    head: [['Peringkat', 'Nama Produk', 'Jumlah Terjual']],
    body: stats.topProducts.map((p, idx) => [(idx + 1).toString(), p.name, p.quantity.toString()]),
    theme: 'striped',
    headStyles: { fillColor: [100, 100, 100] }
  });

  // Cash Flow Summary
  let nextY = doc.lastAutoTable.finalY + 10;
  if (cashFlow && cashFlow.length > 0) {
    const totalIn = cashFlow.filter(c => c.type === 'IN').reduce((sum, c) => sum + c.amount, 0);
    const totalOut = cashFlow.filter(c => c.type === 'OUT').reduce((sum, c) => sum + c.amount, 0);
    
    // Check if we need a new page for cashflow
    if (nextY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        nextY = 20;
    }

    doc.text('Ringkasan Arus Kas', 14, nextY);
    doc.autoTable({
      startY: nextY + 4,
      head: [['Total Uang Masuk', 'Total Uang Keluar', 'Saldo Bersih']],
      body: [[
        formatCurrency(totalIn),
        formatCurrency(totalOut),
        formatCurrency(totalIn - totalOut)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // var(--secondary)
    });
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  const printDate = new Date().toLocaleString('id-ID');
  doc.text(`Dicetak pada: ${printDate}`, 14, doc.internal.pageSize.getHeight() - 10);

  doc.save(`Ringkasan_POS_${timeframeLabel.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};
