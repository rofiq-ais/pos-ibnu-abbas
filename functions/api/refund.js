// functions/api/refund.js
// POST  /api/refund  — proses refund sebagian atau seluruh item transaksi

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

    const refundTotal = refundItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const refundId    = `RFD-${Date.now()}`;
    const now         = new Date().toISOString();

    const statements = [];

    // 2. Kembalikan stok setiap item yang di-refund
    for (const item of refundItems) {
      statements.push(
        context.env.DB
          .prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .bind(item.quantity, item.id)
      );
    }

    // 3. Catat refund ke cash_flow (tipe OUT)
    statements.push(
      context.env.DB.prepare(`
        INSERT INTO cash_flow (id, type, category, amount, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        refundId,
        'OUT',
        'Refund',
        refundTotal,
        `Refund Transaksi - ${transactionId}`,
        now
      )
    );

    // 4. Tandai transaksi asli sebagai refunded (simpan refund_items & refund_total)
    //    Kolom ini mungkin belum ada — gunakan ON CONFLICT safe UPDATE via ALTER jika perlu.
    //    Karena schema awal belum punya kolom refund, kita tambahkan via ALTER (idempotent).
    try {
      await context.env.DB
        .prepare('ALTER TABLE transactions ADD COLUMN refunded_items TEXT')
        .run();
    } catch (_) { /* kolom sudah ada, abaikan */ }

    try {
      await context.env.DB
        .prepare('ALTER TABLE transactions ADD COLUMN refund_total INTEGER DEFAULT 0')
        .run();
    } catch (_) { /* kolom sudah ada, abaikan */ }

    // Baca nilai refunded sebelumnya agar bisa di-merge
    const prevRefundedRaw = txn.refunded_items;
    const prevRefunded    = prevRefundedRaw ? JSON.parse(prevRefundedRaw) : [];
    const prevRefundTotal = txn.refund_total || 0;

    // Merge: jika produk yang sama di-refund lagi, tambahkan qty-nya
    const mergedMap = {};
    for (const item of prevRefunded) mergedMap[item.id] = { ...item };
    for (const item of refundItems) {
      if (mergedMap[item.id]) {
        mergedMap[item.id].quantity += item.quantity;
      } else {
        mergedMap[item.id] = { ...item };
      }
    }
    const mergedItems = Object.values(mergedMap);

    statements.push(
      context.env.DB
        .prepare('UPDATE transactions SET refunded_items = ?, refund_total = ? WHERE id = ?')
        .bind(JSON.stringify(mergedItems), prevRefundTotal + refundTotal, transactionId)
    );

    await context.env.DB.batch(statements);

    return Response.json({
      success: true,
      refundId,
      refundTotal,
      refundedItems: mergedItems,
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
