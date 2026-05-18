export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM cash_flow ORDER BY created_at DESC').all();
    return Response.json(results || []);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const id = data.id || `CF-${Date.now()}`;
    const type = data.type; // 'IN' or 'OUT'
    const category = data.category;
    const amount = data.amount;
    const description = data.description || '';
    const created_at = data.created_at || new Date().toISOString();

    await context.env.DB.prepare(
      "INSERT INTO cash_flow (id, type, category, amount, description, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, type, category, amount, description, created_at).run();

    return Response.json({ id, success: true });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
