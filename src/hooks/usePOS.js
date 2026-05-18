import { useState, useEffect } from 'react';
import { initialProducts } from '../data/seed';
import { filterByTimeframe } from '../utils';

export function usePOS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [error, setError] = useState(null);
  const [soMode, setSoMode] = useState(false); // Stok Opname mode

  // Fetch data from Cloudflare API — with offline fallback
  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.length > 0 ? prodData : initialProducts);
        } else {
          // API down (502, etc.) — gunakan seed data lokal
          console.warn('[POS] API produk tidak tersedia, pakai data lokal.');
          setProducts(initialProducts);
        }

        const txnRes = await fetch('/api/transactions');
        if (txnRes.ok) {
          const txnData = await txnRes.json();
          setTransactions(txnData);
        }

        const cfRes = await fetch('/api/cashflow');
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          setCashFlow(cfData);
        }
      } catch (e) {
        // Network error (wrangler belum jalan) — pakai data lokal
        console.warn('[POS] Network error, pakai data lokal:', e.message);
        setProducts(initialProducts);
      }
    };
    fetchData();
  }, []);

  // Cart operations
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          setError('Stok produk tidak mencukupi!');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + amount;
          if (newQuantity < 1) return item;
          if (newQuantity > item.stock) {
            setError('Stok produk tidak mencukupi!');
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const checkout = async (amountPaid, customerName = 'santri') => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (cart.length === 0) return { success: false, message: 'Cart is empty' };

    const newTransaction = {
      id: `TXN-${Date.now()}`,
      date: new Date().toISOString(),
      customerName,
      items: [...cart],
      total,
      amountPaid,
      change: amountPaid - total,
    };

    // Helper to commit transaction to local state (used both in online and offline mode)
    const commitToLocalState = () => {
      setTransactions(prev => [newTransaction, ...prev]);
      
      const actualIn = Math.min(amountPaid, total);
      if (actualIn > 0) {
        const newCashFlow = {
          id: `CF-${Date.now()}`,
          type: 'IN',
          category: 'Penjualan',
          amount: actualIn,
          description: `Penjualan POS - ${newTransaction.id}`,
          created_at: newTransaction.date
        };
        setCashFlow(prev => [newCashFlow, ...prev]);
      }

      setProducts(prev => prev.map((product) => {
        const cartItem = cart.find((item) => item.id === product.id);
        return cartItem ? { ...product, stock: product.stock - cartItem.quantity } : product;
      }));
      clearCart();
    };

    // Save to API
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
      });

      if (!res.ok) {
        // API error (e.g. 502 Bad Gateway in dev) — fallback to local-only mode
        // so the full print/success flow can still be tested
        console.warn('[POS] API tidak tersedia, menyimpan transaksi secara lokal (offline mode).');
        commitToLocalState();
        return { success: true, transaction: newTransaction, offlineMode: true };
      }

      commitToLocalState();
      return { success: true, transaction: newTransaction };
    } catch (e) {
      // Network error (wrangler belum jalan) — sama, fallback lokal
      console.warn('[POS] Network error, offline mode aktif:', e.message);
      commitToLocalState();
      return { success: true, transaction: newTransaction, offlineMode: true };
    }
  };

  const payKasbon = async (transactionId, amount) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionId, amount })
      });
      if (!res.ok) throw new Error('Failed to pay kasbon');
      
      const { newAmountPaid, newChange } = await res.json();
      
      // Update local transactions
      setTransactions(transactions.map(t => 
        t.id === transactionId 
          ? { ...t, amountPaid: newAmountPaid, change: newChange } 
          : t
      ));

      // Update local cashflow
      const newCashFlow = {
        id: `CF-${Date.now()}`,
        type: 'IN',
        category: 'Pembayaran Kasbon',
        amount: amount,
        description: `Pelunasan Kasbon - ${transactionId}`,
        created_at: new Date().toISOString()
      };
      setCashFlow([newCashFlow, ...cashFlow]);
      
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Server error during payment' };
    }
  };

  // Product management
  const addProduct = async (product) => {
    const existingProduct = products.find(p => p.name.toLowerCase() === product.name.toLowerCase());
    const productPayload = existingProduct ? { ...product, id: existingProduct.id } : product;

    // Helper: commit to local state (used in both online & offline mode)
    const commitProductLocal = (id) => {
      if (existingProduct) {
        setProducts(prev => prev.map(p =>
          p.id === existingProduct.id
            ? {
                ...p,
                stock: p.stock + product.stock,
                minStock: product.minStock || p.minStock,
                costPrice: product.costPrice || p.costPrice,
                price: product.price || p.price
              }
            : p
        ));
        return { success: true, updated: true };
      } else {
        const newProduct = { ...productPayload, id: id || `local-${Date.now()}` };
        setProducts(prev => [...prev, newProduct]);
        return { success: true, updated: false };
      }
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });

      if (!res.ok) {
        console.warn('[POS] API tidak tersedia, produk disimpan lokal (offline mode).');
        return commitProductLocal();
      }

      const { id } = await res.json();
      return commitProductLocal(id);
    } catch (e) {
      console.warn('[POS] Network error, produk disimpan lokal:', e.message);
      return commitProductLocal();
    }
  };

  const updateProduct = async (updatedProduct) => {
    try {
      await fetch('/api/products', {
        method: 'POST', // our upsert logic uses POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (e) {
      console.error('Failed to update', e);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      setProducts(products.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  // ── Refund Transaksi ──────────────────────────────────────────────────────
  const refundTransaction = async (transactionId, refundItems) => {
    try {
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, refundItems }),
      });
      if (!res.ok) throw new Error('Refund failed');
      const data = await res.json();

      // Update local transactions — tandai item yang sudah direfund
      setTransactions(prev => prev.map(t =>
        t.id === transactionId
          ? { ...t, refundedItems: data.refundedItems, refundTotal: (t.refundTotal || 0) + data.refundTotal }
          : t
      ));

      // Kembalikan stok di local state
      setProducts(prev => prev.map(p => {
        const ri = refundItems.find(r => r.id === p.id);
        return ri ? { ...p, stock: p.stock + ri.quantity } : p;
      }));

      // Catat ke local cashflow
      const newCF = {
        id: data.refundId,
        type: 'OUT',
        category: 'Refund',
        amount: data.refundTotal,
        description: `Refund Transaksi - ${transactionId}`,
        created_at: new Date().toISOString(),
      };
      setCashFlow(prev => [newCF, ...prev]);

      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.message };
    }
  };

  // ── Stok Opname ───────────────────────────────────────────────────────────
  const stockOpname = async (productId, actualStock, note = '') => {
    try {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, actualStock, note }),
      });
      if (!res.ok) throw new Error('Stock opname failed');
      const data = await res.json();

      // Update local state langsung
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock: actualStock } : p
      ));

      return { success: true, diff: data.diff };
    } catch (e) {
      console.error(e);
      return { success: false, message: e.message };
    }
  };

  const getDashboardStats = (timeframe = 'today', customDate = null) => {
    const filteredTransactions = filterByTimeframe(transactions, 'date', timeframe, customDate);

    const revenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const cost = filteredTransactions.reduce((sum, t) => {
      return sum + t.items.reduce((itemSum, item) => itemSum + (item.costPrice || 0) * item.quantity, 0);
    }, 0);

    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
    const aov = filteredTransactions.length > 0 ? (revenue / filteredTransactions.length) : 0;

    const productSales = {};
    const categorySalesMap = {};
    const hourCounts = {};

    filteredTransactions.forEach(t => {
      // Peak hours
      const hour = new Date(t.date).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;

      t.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        
        // Category sales
        const itemRevenue = item.price * item.quantity;
        categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + itemRevenue;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const categorySales = Object.entries(categorySalesMap)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Get the busiest hour
    let peakHour = '-';
    let maxTxnHour = 0;
    Object.entries(hourCounts).forEach(([hr, count]) => {
      if (count > maxTxnHour) {
        maxTxnHour = count;
        peakHour = hr;
      }
    });

    return {
      revenue,
      profit,
      profitMargin,
      aov,
      transactionCount: filteredTransactions.length,
      lowStockCount: products.filter(p => p.stock <= (p.minStock || 0)).length,
      topProducts,
      categorySales,
      peakHour,
      peakHourCount: maxTxnHour
    };
  };

  // Cash flow management
  const addExpense = async (expense) => {
    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, type: 'OUT' })
      });
      if (!res.ok) throw new Error('Failed to save expense');
      
      const data = await res.json();
      const newRecord = {
        ...expense,
        id: data.id,
        type: 'OUT',
        created_at: expense.created_at || new Date().toISOString()
      };
      setCashFlow([newRecord, ...cashFlow]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Server error' };
    }
  };

  return {
    products,
    cart,
    transactions,
    cashFlow,
    error,
    setError,
    soMode,
    setSoMode,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    payKasbon,
    refundTransaction,
    addProduct,
    updateProduct,
    deleteProduct,
    stockOpname,
    getDashboardStats,
    addExpense
  };
}
