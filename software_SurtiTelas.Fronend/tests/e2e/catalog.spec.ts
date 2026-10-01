import { test, expect } from '@playwright/test';

/**
 * Prueba de humo REAL contra los servidores locales (Vite 5173 + API 3000).
 * No sustituye a las unitarias: sirve para comprobar que los flujos de filtros
 * funcionan de extremo a extremo con la respuesta y el renderizado auténticos.
 */

const irAlCatalogo = async (page: import('@playwright/test').Page, url = '/catalogo') => {
  await page.goto(url);
  await expect(page.getByTestId('products-grid')).toBeVisible({ timeout: 30000 });
};

const pill = (page: import('@playwright/test').Page, nombre: string) =>
  page.locator('.category-pill', { hasText: new RegExp(`^${nombre}$`) });

const CARD = '.premium-product-card';

test.describe('Catálogo - humo end-to-end', () => {
  test('las píldoras de categoría no desaparecen al filtrar', async ({ page }) => {
    await irAlCatalogo(page);
    await expect(pill(page, 'Todas')).toBeVisible();

    const nombres = await page.locator('.category-pill').allInnerTexts();
    expect(nombres.length).toBeGreaterThan(1);

    await pill(page, 'Camisetas').click();
    await expect(page).toHaveURL(/\?categoria=Camisetas/);
    await expect(page.locator('.results-count')).toContainText('producto');

    // TODAS las categorías siguen disponibles tras filtrar.
    await expect(pill(page, 'Blusas')).toBeVisible();
    await expect(pill(page, 'Camisetas')).toBeVisible();
    const trasFiltrar = await page.locator('.category-pill').allInnerTexts();
    expect(trasFiltrar).toEqual(nombres);
  });

  test('transición entre dos categorías y regreso a "Todas"', async ({ page }) => {
    await irAlCatalogo(page, '/catalogo?categoria=Camisetas');

    await pill(page, 'Blusas').click();
    await expect(page).toHaveURL(/\?categoria=Blusas/);
    await expect(page.locator('.empty-catalog')).toBeHidden();

    await pill(page, 'Todas').click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.locator('.empty-catalog')).toBeHidden();

    // El catálogo completo vuelve a verse.
    const antes = await page.locator(CARD).count();
    expect(antes).toBeGreaterThan(0);
  });

  test('"Limpiar filtros" deja la URL exactamente en /catalogo', async ({ page }) => {
    await irAlCatalogo(page, '/catalogo?categoria=Camisetas');
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.locator('.empty-catalog')).toBeHidden();
  });

  test('cambio rápido de categoría no deja productos de la anterior', async ({ page }) => {
    await irAlCatalogo(page);
    await pill(page, 'Camisetas').click();
    await pill(page, 'Blusas').click();
    await expect(page).toHaveURL(/\?categoria=Blusas$/);

    await page.waitForTimeout(1200);
    // Solo puede haber 1 producto de categoría Blusas en los datos de prueba.
    const tarjetas = await page.locator(CARD).count();
    expect(tarjetas).toBeLessThanOrEqual(1);
  });

  test('la búsqueda escribe el parámetro q en la URL', async ({ page }) => {
    await irAlCatalogo(page);
    const input = page.getByPlaceholder('Buscar productos, marcas, categorías...');
    await input.fill('camiseta');
    await expect(page).toHaveURL(/[?&]q=camiseta/, { timeout: 5000 });
    await expect(page.locator(CARD).first()).toBeVisible();
  });

  test('los filtros del drawer se conservan al reabrirlo', async ({ page }) => {
    await irAlCatalogo(page);
    await page.getByRole('button', { name: /^Filtros/ }).click();
    await expect(page.locator('.filter-drawer')).toBeVisible();

    await page.locator('.talla-pill', { hasText: /^M$/ }).first().click();
    await page.getByRole('button', { name: 'Aplicar Filtros' }).click();
    await expect(page).toHaveURL(/talla=M/);

    // Reabrir: la talla M debe seguir marcada.
    await page.getByRole('button', { name: /^Filtros/ }).click();
    await expect(page.locator('.filter-drawer')).toBeVisible();
    await expect(page.locator('.talla-pill.active')).toHaveText('M');
  });

  test('la URL es la fuente de verdad al recargar', async ({ page }) => {
    await irAlCatalogo(page, '/catalogo?categoria=Camisetas');
    await page.reload();
    await expect(page.locator('.category-pill.active')).toHaveText('Camisetas');
    await expect(page.locator('.empty-catalog')).toBeHidden();
  });
});