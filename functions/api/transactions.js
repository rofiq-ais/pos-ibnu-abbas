export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    const formattedResults = results.map(t => ({
      ...t,
      items: JSON.parse(t.items)
    }));
    return Response.json(formattedResults);
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const txn = await context.request.json();
    
    const statements = [];

    // 1. Insert Transaction
    statements.push(
      context.env.DB.prepare(`
        INSERT INTO transactions (id, date, customerName, total, amountPaid, change, items)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        txn.id,
        txn.date,
        txn.customerName,
        txn.total,
        txn.amountPaid,
        txn.change,
        JSON.stringify(txn.items)
      )
    );

    // 2. Insert into Cash Flow (Type IN)
    const actualIn = Math.min(txn.amountPaid, txn.total);
    if (actualIn > 0) {
      const cashFlowId = `CF-${Date.now()}`;
      statements.push(
        context.env.DB.prepare(`
          INSERT INTO cash_flow (id, type, category, amount, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          cashFlowId,
          'IN',
          'Penjualan',
          actualIn,
          `Penjualan POS - ${txn.id}`,
          txn.date
        )
      );
    }

    // 3. Deduct stock for each item
    for (const item of txn.items) {
      statements.push(
        context.env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
          .bind(item.quantity, item.id)
      );
    }

    // Execute all in a batch transaction
    await context.env.DB.batch(statements);

    return Response.json({ success: true });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

export async function onRequestPut(context) {
  try {
    const { id, amount } = await context.request.json();
    
    // 1. Get current transaction
    const txn = await context.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
    if (!txn) return new Response('Transaction not found', { status: 404 });

    const newAmountPaid = txn.amountPaid + amount;
    const newChange = newAmountPaid - txn.total;

    const statements = [];

    // 2. Update transaction
    statements.push(
      context.env.DB.prepare('UPDATE transactions SET amountPaid = ?, change = ? WHERE id = ?')
        .bind(newAmountPaid, newChange, id)
    );

    // 3. Insert Cash Flow
    const cashFlowId = `CF-${Date.now()}`;
    statements.push(
      context.env.DB.prepare(`
        INSERT INTO cash_flow (id, type, category, amount, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        cashFlowId,
        'IN',
        'Pembayaran Kasbon',
        amount,
        `Pelunasan Kasbon - ${id}`,
        new Date().toISOString()
      )
    );

    await context.env.DB.batch(statements);

    return Response.json({ success: true, newAmountPaid, newChange });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
