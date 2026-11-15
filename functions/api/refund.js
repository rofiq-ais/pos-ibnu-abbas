// functions/api/refund.js
// POST  /api/refund  — proses refund sebagian atau seluruh item transaksi
// Kolom refunded_items & refund_total sudah ada di schema D1 (tidak perlu ALTER TABLE runtime)

export async function onRequestPost(context) {
  try {
    const { transactionId, refundItems } = await context.request.json();
    // refundItems: [{ id, name, price, quantity }]

    if (!transactionId || !Array.isArray(refundItems) || refundItems.length === 0) {
      return new Response('Invalid payload', { status: 400 });
    }

    // 1. Ambil transaksi asli
    const txn = await context.env.DB
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .bind(transactionId)
      .first();
    if (!txn) return new Response('Transaction not found', { status: 404 });

    // 2. Parse data refund sebelumnya dari DB
    const originalItems   = JSON.parse(txn.items || '[]');
    const prevRefunded    = txn.refunded_items ? JSON.parse(txn.refunded_items) : [];
    const prevRefundTotal = txn.refund_total || 0;

    // 3. Validasi backend: qty refund tidak boleh melebihi sisa qty yang bisa di-refund
    for (const ri of refundItems) {
      const original      = originalItems.find(o => o.id === ri.id);
      const alreadyRefund = prevRefunded.find(r => r.id === ri.id)?.quantity || 0;
      const maxRefund     = (original?.quantity || 0) - alreadyRefund;

      if (!original) {
        return new Response(`Item ${ri.id} tidak ada di transaksi ini`, { status: 400 });
      }
      if (ri.quantity <= 0 || ri.quantity > maxRefund) {
        return new Response(
          `Qty refund item "${ri.name}" tidak valid (maks tersisa: ${maxRefund})`,
          { status: 400 }
        );
      }
    }

    const refundTotal = refundItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const refundId    = `RFD-${Date.now()}`;
    const now         = new Date().toISOString();

    const statements = [];

    // 4. Kembalikan stok setiap item yang di-refund
    for (const item of refundItems) {
      statements.push(
        context.env.DB
          .prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .bind(item.quantity, item.id)
      );
    }

    // 5. Catat ke cash_flow (tipe OUT — uang keluar kembali ke pembeli)
    statements.push(
      context.env.DB.prepare(
        'INSERT INTO cash_flow (id, type, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(refundId, 'OUT', 'Refund', refundTotal, `Refund Transaksi - ${transactionId}`, now)
    );

    // 6. Merge refunded_items dengan data refund sebelumnya (mendukung refund bertingkat)
    const mergedMap = {};
    for (const item of prevRefunded)  mergedMap[item.id] = { ...item };
    for (const item of refundItems) {
      if (mergedMap[item.id]) {
        mergedMap[item.id].quantity += item.quantity;
      } else {
        mergedMap[item.id] = { ...item };
      }
    }
    const mergedItems = Object.values(mergedMap);

    // 7. Update baris transaksi — tandai sebagai (sebagian) refunded
    statements.push(
      context.env.DB
        .prepare('UPDATE transactions SET refunded_items = ?, refund_total = ? WHERE id = ?')
        .bind(JSON.stringify(mergedItems), prevRefundTotal + refundTotal, transactionId)
    );

    // Jalankan semua statement secara atomik (batch)
    await context.env.DB.batch(statements);

    return Response.json({
      success:       true,
      refundId,
      refundTotal,
      refundedItems: mergedItems,
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
