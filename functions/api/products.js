export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM products').all();
    return Response.json(results);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const product = await context.request.json();
    const id = product.id || `p${Date.now()}`;
    
    // Auto-heal: Ensure barcode column exists in products table
    try {
      await context.env.DB.prepare('ALTER TABLE products ADD COLUMN barcode TEXT').run();
    } catch (_) {}
    try {
      await context.env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)').run();
    } catch (_) {}

    await context.env.DB.prepare(`
      INSERT INTO products (id, name, category, price, costPrice, stock, minStock, image, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name,
        category = excluded.category,
        image = excluded.image,
        stock = excluded.stock,
        price = excluded.price,
        costPrice = excluded.costPrice,
        minStock = excluded.minStock,
        barcode = excluded.barcode
    `).bind(
      id,
      product.name,
      product.category,
      product.price,
      product.costPrice || 0,
      product.stock,
      product.minStock || 0,
      product.image || '',
      product.barcode || null
    ).run();

    return Response.json({ success: true, id });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    if (id) {
      await context.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
      return Response.json({ success: true });
    }
    return new Response('Missing id', { status: 400 });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
