// functions/api/stock-opname.js
// POST /api/stock-opname — set stok produk ke nilai aktual (stok opname / SO)

export async function onRequestPost(context) {
  try {
    const { productId, actualStock, note } = await context.request.json();
    // actualStock: nilai stok real hasil hitung fisik
    // note       : catatan opsional (mis. "SO 18 Mei 2026")

    if (!productId || actualStock === undefined || actualStock < 0) {
      return new Response('Invalid payload', { status: 400 });
    }

    // 1. Ambil stok sistem saat ini
    const product = await context.env.DB
      .prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId)
      .first();
    if (!product) return new Response('Product not found', { status: 404 });

    const diff     = actualStock - product.stock;  // positif = selisih plus, negatif = selisih kurang
    const now      = new Date().toISOString();
    const soId     = `SO-${Date.now()}`;

    const statements = [];

    // 2. Update stok produk ke nilai aktual
    statements.push(
      context.env.DB
        .prepare('UPDATE products SET stock = ? WHERE id = ?')
        .bind(actualStock, productId)
    );

    // 3. Catat selisih ke cash_flow sebagai penyesuaian (hanya jika ada selisih)
    if (diff !== 0) {
      // Coba buat tabel so_log jika belum ada (idempotent)
      try {
        await context.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS so_log (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            stock_before INTEGER NOT NULL,
            stock_after INTEGER NOT NULL,
            diff INTEGER NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL
          )
        `).run();
      } catch (_) {}

      statements.push(
        context.env.DB.prepare(`
          INSERT INTO so_log (id, product_id, product_name, stock_before, stock_after, diff, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(soId, productId, product.name, product.stock, actualStock, diff, note || '', now)
      );
    }

    await context.env.DB.batch(statements);

    return Response.json({
      success: true,
      productId,
      stockBefore: product.stock,
      stockAfter: actualStock,
      diff,
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
