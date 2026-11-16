import { test, expect } from '@playwright/test';

// Sample mock products for safe and consistent testing without database pollution
const mockProducts = [
  {
    id: 'test-p1',
    name: 'Classic Burger',
    price: 45000,
    costPrice: 32000,
    category: 'Food',
    stock: 50,
    minStock: 10,
    barcode: '111111'
  },
  {
    id: 'test-p2',
    name: 'French Fries',
    price: 25000,
    costPrice: 15000,
    category: 'Snack',
    stock: 100,
    minStock: 20,
    barcode: '222222'
  },
  {
    id: 'test-p3',
    name: 'Iced Coffee',
    price: 30000,
    costPrice: 12000,
    category: 'Beverage',
    stock: 5,
    minStock: 10, // low stock item
    barcode: '333333'
  }
];

test.describe('E2E Kasir & Transaksi POS', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept API routes to guarantee isolated testing without cloud DB dependency
    await page.route('/api/products*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProducts),
        });
      } else if (method === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: postData.id || `p-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('/api/transactions*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === 'POST') {
        const txn = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: txn.id }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('/api/cashflow*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: `cf-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
  });

  test('1. Memuat aplikasi dan menampilkan katalog produk kasir', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Kasir');
    
    // Pastikan produk ter-render
    const productCards = page.locator('.product-card');
    await expect(productCards).toHaveCount(3);
    await expect(page.locator('.product-name').first()).toHaveText('Classic Burger');
  });

  test('2. Filter kategori dan pencarian produk berfungsi baik', async ({ page }) => {
    // Filter Snack
    await page.getByRole('button', { name: 'Snack' }).click();
    await expect(page.locator('.product-card')).toHaveCount(1);
    await expect(page.locator('.product-name')).toHaveText('French Fries');

    // Filter Semua Kategori
    await page.getByRole('button', { name: 'Semua Kategori' }).click();
    await expect(page.locator('.product-card')).toHaveCount(3);

    // Cari produk via input pencarian
    const searchInput = page.getByPlaceholder('Cari produk...');
    await searchInput.fill('Coffee');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await expect(page.locator('.product-name')).toHaveText('Iced Coffee');

    // Kosongkan search
    await searchInput.fill('');
    await expect(page.locator('.product-card')).toHaveCount(3);
  });

  test('3. Alur transaksi penuh: tambah ke keranjang, ubah kuantiti, dan checkout uang pas', async ({ page, isMobile }) => {
    // Tambah 2 produk ke keranjang
    await page.locator('.product-card').filter({ hasText: 'Classic Burger' }).click();
    await page.locator('.product-card').filter({ hasText: 'French Fries' }).click();

    // Jika di mobile, buka mobile cart sheet
    if (isMobile) {
      const mobileCartBar = page.locator('.mobile-cart-bar');
      await expect(mobileCartBar).toBeVisible();
      await mobileCartBar.click();
    }

    // Periksa isi keranjang yang terlihat (Classic Burger: 45.000 + French Fries: 25.000 = 70.000)
    const cartScope = isMobile ? page.locator('.mobile-cart-content') : page.locator('.desktop-cart');
    await expect(cartScope.locator('.cart-item')).toHaveCount(2);

    // Tambah kuantiti French Fries (+1)
    const friesItem = cartScope.locator('.cart-item').filter({ hasText: 'French Fries' });
    await friesItem.locator('.cart-qty-btn').nth(1).click(); // tombol plus

    // Subtotal sekarang: 45.000 + (25.000 * 2) = 95.000
    // Isi nama pembeli
    const customerInput = cartScope.getByPlaceholder('Nama Pembeli');
    await customerInput.fill('Santri Ahmad');

    // Klik tombol Bayar
    const checkoutBtn = cartScope.locator('.checkout-btn');
    await checkoutBtn.click();

    // Verifikasi Modal Konfirmasi Pembayaran muncul
    const checkoutModal = page.locator('.checkout-modal');
    await expect(checkoutModal).toBeVisible();
    await expect(checkoutModal.locator('h2')).toHaveText('Konfirmasi Pembayaran');
    await expect(checkoutModal).toContainText('Santri Ahmad');
    await expect(checkoutModal).toContainText('95.000');

    // Klik tombol "Pas" untuk bayar uang pas
    await page.getByRole('button', { name: 'Pas', exact: true }).click();
    await expect(checkoutModal.locator('.change-value')).toHaveText('Rp 0');

    // Konfirmasi Bayar
    await page.getByRole('button', { name: 'Konfirmasi Bayar' }).click();

    // Modal struk/sukses tampil
    const successModal = page.locator('.modal-content.success-modal');
    await expect(successModal).toBeVisible();
    await expect(successModal.locator('h2')).toHaveText('Transaksi Berhasil!');
    await expect(successModal).toContainText('Santri Ahmad');
    await expect(successModal).toContainText('95.000');

    // Tutup struk dengan tombol "Selesai"
    await page.getByRole('button', { name: 'Selesai' }).click();
    await expect(successModal).not.toBeVisible();

    // Pastikan keranjang telah kosong
    await expect(cartScope.locator('.cart-item')).toHaveCount(0);
  });

  test('4. Transaksi kasbon (pembayaran kurang dari total) tercatat dengan benar', async ({ page, isMobile }) => {
    // Tambah Classic Burger (Rp 45.000)
    await page.locator('.product-card').filter({ hasText: 'Classic Burger' }).click();

    const cartScope = isMobile ? page.locator('.mobile-cart-content') : page.locator('.desktop-cart');

    if (isMobile) {
      await page.locator('.mobile-cart-bar').click();
    }

    const customerInput = cartScope.getByPlaceholder('Nama Pembeli');
    await customerInput.fill('Ustadz Zaid');

    await cartScope.locator('.checkout-btn').click();

    // Bayar Rp 20.000 (kasbon Rp 25.000)
    const amountInput = page.locator('.amount-input');
    await amountInput.fill('20000');

    // Kembalian harus menunjukkan minus / kasbon
    await expect(page.locator('.change-display')).toContainText('Kurang Rp 25.000');
    const submitBtn = page.getByRole('button', { name: 'Simpan Kasbon' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Modal sukses kasbon
    const successModal = page.locator('.modal-content.success-modal');
    await expect(successModal).toBeVisible();
    await expect(successModal.locator('h2')).toHaveText('Transaksi Berhasil!');
    await expect(successModal).toContainText('Sisa Tagihan');
    await expect(successModal).toContainText('25.000');
    await page.getByRole('button', { name: 'Selesai' }).click();
  });

  test('5. Validasi batas stok mencegah penambahan melebihi stok yang ada', async ({ page }) => {
    // Iced Coffee memiliki stok 5
    const coffeeCard = page.locator('.product-card').filter({ hasText: 'Iced Coffee' });

    // Klik 5 kali
    for (let i = 0; i < 5; i++) {
      await coffeeCard.click();
    }

    // Klik ke-6 kali (harus muncul toast error stok tidak mencukupi)
    await coffeeCard.click();

    const errorToast = page.locator('.error-toast');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('Stok produk tidak mencukupi');
  });

});
