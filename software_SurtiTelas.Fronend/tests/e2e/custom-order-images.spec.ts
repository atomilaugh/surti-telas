import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'andres.test@example.com';
const TEST_PASSWORD = 'Test123456';

test.describe('Custom order reference images E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cliente/**');
  });

  test('full flow: create, submit, detail, reload, edit, second image', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[SUBMIT]') || text.includes('CUSTOM-ORDER')) {
        console.log('[BROWSER LOG]', text);
      }
    });

    await page.goto('/cliente/cotizaciones/nueva');
    await page.waitForSelector('text=Paso 1');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder="Cliente"]', 'Andres Daniel Ruiz Murillo');
    await page.fill('input[placeholder="Teléfono"]', '3015693683');
    await page.fill('input[placeholder="Email"]', 'andres.test@example.com');

    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 2');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder="Escribe el nombre del producto o selecciona uno del catálogo"]', 'Producto prueba');
    await page.fill('input[placeholder="Cantidad"]', '1');

    const mostrarDistBtn = page.locator('button:has-text("Mostrar")').first();
    await expect(mostrarDistBtn).toBeVisible({ timeout: 10000 });
    await mostrarDistBtn.click();
    await page.waitForTimeout(500);

    const tallaInput = page.locator('input[placeholder="0"]').nth(2);
    await expect(tallaInput).toBeVisible({ timeout: 10000 });
    await tallaInput.fill('1');

    const mostrarBtn = page.locator('button:has-text("Mostrar")').last();
    await expect(mostrarBtn).toBeVisible({ timeout: 10000 });
    await mostrarBtn.click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Agregar personalización")');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    await page.selectOption('select', 'ESTAMPADO');
    await page.fill('input[placeholder="Ej: DTF, Serigrafía..."]', 'ESTAMPADO');
    await page.fill('textarea[placeholder="Describe el diseño..."]', 'me gustaría un Pikachu en la espalda');

    const ubicacionBtn = page.locator('button:has-text("ESPALDA")');
    if (await ubicacionBtn.count() > 0) {
      await ubicacionBtn.first().click();
    }

    const agregarVarianteBtn = page.locator('button:has-text("Agregar variante")');
    if (await agregarVarianteBtn.count() > 0) {
      await agregarVarianteBtn.first().click();
      await page.waitForTimeout(500);
      await page.fill('input[placeholder="Talla"]', 'M');
      await page.fill('input[placeholder="Color"]', 'Rojo');
      await page.fill('input[placeholder="Cant."]', '1');
    }

    const fileInput = page.locator('[data-testid="reference-image-input"]');
    await fileInput.setInputFiles('src/assets/images/logos/partner-logo-2-Photoroom.png');
    await page.waitForTimeout(500);

    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 3');
    await page.waitForTimeout(500);

    const fechaInput = page.locator('input[type="date"], input[placeholder*="Fecha"], input[placeholder*="fecha"]').first();
    if (await fechaInput.count() > 0) {
      await fechaInput.fill('2026-12-31');
    }

    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 4');
    await page.waitForTimeout(500);

    const summaryImg = page.locator('img[alt*="Referencia"]').first();
    await expect(summaryImg).toBeVisible();
    const summarySrc = await summaryImg.getAttribute('src');
    expect(summarySrc).toBeTruthy();

    const buttonType = await page.locator('[data-testid="quotation-submit"]').getAttribute('type');
    console.log('Button type before click:', buttonType);

    await page.click('[data-testid="quotation-submit"]');
    await page.waitForTimeout(5000);

    const formEl = await page.locator('form').count();
    console.log('Form count:', formEl);

    const savingAfter = await page.locator('text=Enviando...').count();
    console.log('Saving indicator after click:', savingAfter);

    const toastAfter = await page.locator('[data-sonner-toast], .toast').count();
    console.log('Toast count after click:', toastAfter);

    const errorAfter = await page.locator('.errorText, [role="alert"], .text-red-600').count();
    console.log('Error count after click:', errorAfter);

    await page.screenshot({ path: 'playwright-report/after-submit.png' });

    const htmlAfter = await page.content();
    console.log('HTML after submit length:', htmlAfter.length);

    const titleCount = await page.locator('text=Mis Cotizaciones').count();
    console.log('Title count after submit:', titleCount);

    const nuevaSolicitudCount = await page.locator('text=Nueva solicitud').count();
    console.log('Nueva solicitud count after submit:', nuevaSolicitudCount);

    const rowCount = await page.locator('tbody tr').count();
    console.log('Table rows after submit:', rowCount);

    const pathname = await page.evaluate(() => window.location.pathname);
    console.log('Pathname after submit:', pathname);

    await page.waitForTimeout(1000);

    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click({ force: true });
    await page.waitForTimeout(1000);

    const detailImg = page.locator('img[alt*="Referencia"]').first();
    await expect(detailImg).toBeVisible();
    const detailSrc = await detailImg.getAttribute('src');
    expect(detailSrc).toBeTruthy();
    expect(detailSrc).not.toContain('blob:');

    await page.reload();
    await page.waitForTimeout(2000);

    const sessionValueBeforeReload = await page.evaluate(() => sessionStorage.getItem('fromCustomOrderCreate'));
    console.log('sessionStorage fromCustomOrderCreate before reload check:', sessionValueBeforeReload);

    const sessionValueAfterReload = await page.evaluate(() => sessionStorage.getItem('fromCustomOrderCreate'));
    console.log('sessionStorage fromCustomOrderCreate after reload:', sessionValueAfterReload);

    await page.waitForSelector('tbody tr:has(td)', { timeout: 10000 });
    const rowAfterReload = page.locator('tbody tr').first();
    await expect(rowAfterReload).toBeVisible({ timeout: 10000 });
    await rowAfterReload.click({ force: true });
    await page.waitForTimeout(2000);

    const modalHtml = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return 'NO MODAL';
      return modal.innerHTML.slice(0, 2000);
    });
    console.log('Modal HTML after reload:', modalHtml);

    const detailImgAfterReload = page.locator('img[alt*="Referencia"]').first();
    const countAfterReload = await detailImgAfterReload.count();
    console.log('Images after reload count:', countAfterReload);
    if (countAfterReload > 0) {
      const src = await detailImgAfterReload.getAttribute('src');
      console.log('Detail src after reload:', src);
    }
    const detailSrcAfterReload = await detailImgAfterReload.getAttribute('src');
    expect(detailSrcAfterReload).toBeTruthy();
    expect(detailSrcAfterReload).not.toContain('blob:');

    const closeBtn = page.locator('button[aria-label="Cerrar"]').last();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    const actionBtn = page.locator('[aria-label="Abrir menú de acciones"]').first();
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
    await actionBtn.click({ force: true });
    await page.waitForTimeout(500);

    const editBtn = page.locator('text=Editar');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('text=Paso 1');
    await page.waitForTimeout(500);

    const nextEditBtn = page.locator('[data-testid="quotation-next"]').first();
    await expect(nextEditBtn).toBeVisible({ timeout: 10000 });
    await nextEditBtn.click();
    await page.waitForSelector('text=Paso 2');
    await page.waitForTimeout(500);

    const addPersBtn = page.locator('button:has-text("Agregar personalización")').first();
    await expect(addPersBtn).toBeVisible({ timeout: 10000 });
    await addPersBtn.click();
    await page.waitForTimeout(500);

    await page.selectOption('select', 'ESTAMPADO');
    await page.fill('input[placeholder="Ej: DTF, Serigrafía..."]', 'ESTAMPADO');
    await page.fill('textarea[placeholder="Describe el diseño..."]', 'segunda imagen de prueba');
    const ubicacionBtnEdit = page.locator('button:has-text("ESPALDA")');
    if (await ubicacionBtnEdit.count() > 0) {
      await ubicacionBtnEdit.first().click();
    }

    const fileInputEdit = page.locator('[data-testid="reference-image-input"]');
    await expect(fileInputEdit).toBeVisible({ timeout: 10000 });
    await fileInputEdit.setInputFiles('src/assets/images/logos/partner-logo-1.png');
    await page.waitForTimeout(500);

    const persSaveBtn = page.locator('button:has-text("Agregar")').first();
    if (await persSaveBtn.count() > 0) {
      await persSaveBtn.click();
      await page.waitForTimeout(500);
    }

    await page.click('[data-testid="quotation-submit"]');
    await page.waitForTimeout(5000);

    await page.waitForSelector('text=Nueva solicitud', { state: 'visible' });
    await page.waitForTimeout(1000);

    const rowAfterEdit = page.locator('tbody tr').first();
    await expect(rowAfterEdit).toBeVisible({ timeout: 10000 });
    await rowAfterEdit.click({ force: true });
    await page.waitForTimeout(1000);

    const imagesAfterEdit = page.locator('img[alt*="Referencia"]');
    await expect(imagesAfterEdit).toHaveCount(2);
    for (let i = 0; i < 2; i += 1) {
      const src = await imagesAfterEdit.nth(i).getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).not.toContain('blob:');
    }
  });
});
