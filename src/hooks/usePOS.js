import { useState, useEffect } from 'react';
import { initialProducts } from '../data/seed';

export function usePOS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Load from local storage
  useEffect(() => {
    const storedProducts = localStorage.getItem('pos_products');
    const storedTransactions = localStorage.getItem('pos_transactions');

    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(initialProducts);
      localStorage.setItem('pos_products', JSON.stringify(initialProducts));
    }

    if (storedTransactions) {
      setTransactions(JSON.parse(storedTransactions));
    }
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('pos_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Cart operations
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert('Not enough stock!');
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
            alert('Not enough stock!');
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

  const checkout = (amountPaid, customerName = 'santri') => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    if (cart.length === 0) return { success: false, message: 'Cart is empty' };
    if (amountPaid < total) return { success: false, message: 'Insufficient payment' };

    // Update stock
    const updatedProducts = products.map((product) => {
      const cartItem = cart.find((item) => item.id === product.id);
      if (cartItem) {
        return { ...product, stock: product.stock - cartItem.quantity };
      }
      return product;
    });
    setProducts(updatedProducts);

    // Save transaction
    const newTransaction = {
      id: `TXN-${Date.now()}`,
      date: new Date().toISOString(),
      customerName,
      items: [...cart],
      total,
      amountPaid,
      change: amountPaid - total,
    };
    setTransactions([newTransaction, ...transactions]);
    
    clearCart();
    return { success: true, transaction: newTransaction };
  };

  // Product management
  const addProduct = (product) => {
    const newProduct = { ...product, id: `p${Date.now()}` };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (updatedProduct) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  return {
    products,
    cart,
    transactions,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    addProduct,
    updateProduct,
    deleteProduct
  };
}
