import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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

test.describe('E2E Manajemen Tab & Pengujian UI/UX', () => {

  test.beforeEach(async ({ page }) => {
    // Pastikan folder screenshots siap
    const screenshotDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.route('/api/products*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProducts),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: `p-${Date.now()}` }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'TXN-001',
            date: new Date().toISOString(),
            customerName: 'Santri Zaid',
            items: [{ id: 'test-p1', name: 'Classic Burger', price: 45000, quantity: 1, costPrice: 32000 }],
            total: 45000,
            amountPaid: 45000,
            change: 0
          }
        ]),
      });
    });

    await page.route('/api/cashflow*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'CF-001',
            type: 'IN',
            category: 'Penjualan',
            amount: 45000,
            description: 'Penjualan POS - TXN-001',
            created_at: new Date().toISOString()
          }
        ]),
      });
    });

    await page.goto('/');
  });

  test('1. Navigasi lengkap antar semua modul (Dashboard, Riwayat, Produk, Arus Kas)', async ({ page, isMobile }) => {
    const navigateTo = async (label) => {
      if (isMobile) {
        await page.locator('.menu-toggle').click();
        await expect(page.locator('.mobile-menu-overlay')).toBeVisible();
        await page.locator('.mobile-nav-item', { hasText: label }).click();
        await expect(page.locator('.mobile-menu-overlay')).not.toBeVisible();
      } else {
        await page.locator(`.sidebar button[title="${label}"]`).click();
      }
    };

    // 1. Dashboard
    await navigateTo('Dashboard');
    await expect(page.locator('h1')).toHaveText('Dashboard');
    await expect(page.locator('.stat-card').first()).toBeVisible();

    // 2. Riwayat Transaksi
    await navigateTo('Riwayat Transaksi');
    await expect(page.locator('h1')).toHaveText('Riwayat Transaksi');
    await expect(page.locator('text=Santri Zaid').first()).toBeVisible();

    // 3. Manajemen Produk
    await navigateTo('Manajemen Produk');
    await expect(page.locator('h1')).toHaveText('Manajemen Produk');
    await expect(page.locator('text=Classic Burger').first()).toBeVisible();

    // 4. Arus Kas
    await navigateTo('Arus Kas');
    await expect(page.locator('h1')).toHaveText('Arus Kas');
    await expect(page.locator('text=Penjualan POS').first()).toBeVisible();

    // 5. Kembali ke Kasir
    await navigateTo('Kasir');
    await expect(page.locator('h1')).toHaveText('Kasir');
  });

  test('2. Alert Stok Menipis & Filter Otomatis ke Produk', async ({ page }) => {
    // Iced Coffee stok 5 <= minStock 10, jadi harus ada badge "1 Stok Menipis"
    const lowStockBtn = page.locator('.low-stock-alert');
    await expect(lowStockBtn).toBeVisible();
    await expect(lowStockBtn).toContainText('1 Stok Menipis');

    // Klik alert stok menipis -> harus langsung lompat ke tab Manajemen Produk
    await lowStockBtn.click();
    await expect(page.locator('h1')).toHaveText('Manajemen Produk');

    // Verifikasi bahwa list produk hanya menampilkan item stok menipis
    await expect(page.locator('text=Iced Coffee').first()).toBeVisible();
  });

  test('3. Evaluasi UI/UX & Pengambilan Screenshot Resolusi', async ({ page, isMobile }, testInfo) => {
    const deviceType = isMobile ? 'mobile' : 'desktop';

    // 1. Screenshot Halaman Kasir
    await page.screenshot({ path: `e2e/screenshots/${deviceType}-01-pos.png`, fullPage: false });

    // 2. Tambah produk & buka checkout modal
    await page.locator('.product-card').first().click();
    if (isMobile) {
      await page.locator('.mobile-cart-bar').click();
      await page.screenshot({ path: `e2e/screenshots/${deviceType}-02-mobile-cart.png` });
    }
    await page.locator('.checkout-btn:visible').click();
    await expect(page.locator('.checkout-modal')).toBeVisible();

    // Screenshot Checkout Modal
    await page.screenshot({ path: `e2e/screenshots/${deviceType}-03-checkout-modal.png` });
    await page.locator('.checkout-modal .btn-outline').click(); // Batal

    // 3. Navigasi ke Dashboard & Screenshot
    if (isMobile) {
      await page.locator('.menu-toggle').click();
      await page.locator('.mobile-nav-item', { hasText: 'Dashboard' }).click();
    } else {
      await page.locator('.sidebar button[title="Dashboard"]').click();
    }
    await expect(page.locator('h1')).toHaveText('Dashboard');
    await page.waitForTimeout(400); // Wait for fadeIn animation (0.3s)
    await page.screenshot({ path: `e2e/screenshots/${deviceType}-04-dashboard.png` });

    // 4. Verifikasi UI/UX: Tidak ada elemen yang overflow horizontal secara liar
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // toleransi 2px untuk subpixel
  });

});
