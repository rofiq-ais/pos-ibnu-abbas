// functions/api/restock.js
// POST /api/restock — tambah stok produk dan catat ke cash_flow sebagai pengeluaran pembelian

export async function onRequestPost(context) {
  try {
    const { items } = await context.request.json();
    // items: [{ id, name, quantity, costPrice }]

    if (!Array.isArray(items) || items.length === 0) {
      return new Response('Invalid payload', { status: 400 });
    }

    const statements = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (!item.id || item.quantity <= 0) continue;

      // 1. Update stok produk
      statements.push(
        context.env.DB
          .prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
          .bind(item.quantity, item.id)
      );

      // 2. Catat ke cash_flow sebagai pengeluaran pembelian stok (OUT)
      if (item.costPrice && item.costPrice > 0) {
        const cfId = `RST-${item.id}-${Date.now()}`;
        const totalCost = item.quantity * item.costPrice;
        statements.push(
          context.env.DB.prepare(
            'INSERT INTO cash_flow (id, type, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(cfId, 'OUT', 'Restock', totalCost, `Restock ${item.name} (+${item.quantity} unit)`, now)
        );
      }
    }

    await context.env.DB.batch(statements);

    return Response.json({ success: true });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
