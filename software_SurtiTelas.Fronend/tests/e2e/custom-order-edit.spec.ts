import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'andres.test@example.com';
const TEST_PASSWORD = 'Test123456';
const TARGET_NUMERO = 'SOL-0026';

test.describe('Custom order EDIT flow (second reference image)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cliente/**');
  });

  test('edit existing order, add second image, persist both', async ({ page }) => {
    test.setTimeout(120000);
    const evidence: Record<string, unknown> = {};

    await page.goto('/cliente/pedidos-personalizados');
    await page.waitForSelector('tbody tr:has(td)', { timeout: 15000 });

    await page.locator('input[placeholder*="solicitud"]').first().fill(TARGET_NUMERO);
    await page.waitForTimeout(800);
    const targetRow = page.locator('tbody tr', { hasText: TARGET_NUMERO }).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    await targetRow.click({ force: true });
    await page.waitForTimeout(1000);
    const detailImgBefore = page.locator('img[alt*="Referencia"]');
    await expect(detailImgBefore.first()).toBeVisible({ timeout: 10000 });
    const existingSrc = await detailImgBefore.first().getAttribute('src');
    evidence.existingImageSrcBeforeEdit = existingSrc;
    evidence.existingImageIsBlob = (existingSrc || '').startsWith('blob:');
    console.log('EXISTING IMAGE BEFORE EDIT:', existingSrc);

    const closeBtn = page.locator('button[aria-label="Cerrar"]').last();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    const actionBtn = page.locator('[aria-label="Abrir menÃ©n de acciones"]').first();
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
    await actionBtn.click({ force: true });
    await page.waitForTimeout(500);
    const editBtn = page.locator('text=Editar');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('text=Paso 1', { timeout: 10000 });
    const clientName = await page.locator('input[placeholder="Cliente"]').inputValue();
    evidence.clientNameLoaded = clientName;
    console.log('CLIENT NAME LOADED:', clientName);

    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 2');
    await page.waitForTimeout(500);

    const editPersBtn = page.locator('button:has-text("Editar")').filter({ has: page.locator('visible=true') }).first();
    await expect(editPersBtn).toBeVisible({ timeout: 10000 });
    await editPersBtn.click();
    await page.waitForTimeout(800);

    const previewBefore = page.locator('img[alt*="Referencia"]');
    const previewBeforeCount = await previewBefore.count();
    evidence.previewCountBeforeSecondImage = previewBeforeCount;
    if (previewBeforeCount > 0) {
      const src0 = await previewBefore.first().getAttribute('src');
      evidence.existingImageInEditFormSrc = src0;
      evidence.existingImageInEditFormIsBlob = (src0 || '').startsWith('blob:');
      console.log('EXISTING IMAGE IN EDIT FORM:', src0);
    }

    const fileInput = page.locator('[data-testid="reference-image-input"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    await fileInput.setInputFiles('src/assets/images/logos/partner-logo-1.png');
    await page.waitForTimeout(800);

    const previewAfter = page.locator('img[alt*="Referencia"]');
    const previewAfterCount = await previewAfter.count();
    evidence.previewCountAfterSecondImage = previewAfterCount;
    const srcs: string[] = [];
    for (let i = 0; i < previewAfterCount; i += 1) {
      srcs.push((await previewAfter.nth(i).getAttribute('src')) || '');
    }
    evidence.previewSrcsAfterSecondImage = srcs;
    evidence.secondImageIsBlobPreview = srcs.some((s) => s.startsWith('blob:'));
    console.log('PREVIEW SRCS AFTER SECOND IMAGE:', JSON.stringify(srcs));

    const savePersBtn = page.locator('button:has-text("Guardar personalizaciÃ³n")').first();
    await expect(savePersBtn).toBeVisible({ timeout: 10000 });
    await savePersBtn.click();
    await page.waitForTimeout(500);

    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 3');
    await page.waitForTimeout(500);
    await page.click('[data-testid="quotation-next"]');
    await page.waitForSelector('text=Paso 4');
    await page.waitForTimeout(500);

    const summaryImgs = page.locator('img[alt*="Referencia"]');
    const summaryCount = await summaryImgs.count();
    evidence.summaryImageCount = summaryCount;
    const summarySrcs: string[] = [];
    for (let i = 0; i < summaryCount; i += 1) {
      summarySrcs.push((await summaryImgs.nth(i).getAttribute('src')) || '');
    }
    evidence.summarySrcs = summarySrcs;
    console.log('SUMMARY SRCS:', JSON.stringify(summarySrcs));

    await page.click('[data-testid="quotation-submit"]');
    await page.waitForTimeout(6000);

    const toast = page.locator('text=Solicitud actualizada').first();
    evidence.updateToastVisible = await toast.count() > 0;
    console.log('UPDATE TOAST VISIBLE:', evidence.updateToastVisible);

    await page.waitForTimeout(1000);

    const rowAfter = page.locator('tbody tr', { hasText: TARGET_NUMERO }).first();
    await expect(rowAfter).toBeVisible({ timeout: 10000 });
    await rowAfter.click({ force: true });
    await page.waitForTimeout(1000);
    const detailImgs = page.locator('img[alt*="Referencia"]');
    const detailCount = await detailImgs.count();
    evidence.detailImageCountAfterEdit = detailCount;
    const detailSrcs: string[] = [];
    for (let i = 0; i < detailCount; i += 1) {
      detailSrcs.push((await detailImgs.nth(i).getAttribute('src')) || '');
    }
    evidence.detailSrcsAfterEdit = detailSrcs;
    evidence.detailHasBlob = detailSrcs.some((s) => s.startsWith('blob:'));
    console.log('DETAIL SRCS AFTER EDIT:', JSON.stringify(detailSrcs));

    await page.reload();
    await page.waitForSelector('tbody tr:has(td)', { timeout: 15000 });
    const rowAfterReload = page.locator('tbody tr', { hasText: TARGET_NUMERO }).first();
    await expect(rowAfterReload).toBeVisible({ timeout: 10000 });
    await rowAfterReload.click({ force: true });
    await page.waitForTimeout(1000);
    const detailImgsReload = page.locator('img[alt*="Referencia"]');
    const detailCountReload = await detailImgsReload.count();
    evidence.detailImageCountAfterReload = detailCountReload;
    const detailSrcsReload: string[] = [];
    for (let i = 0; i < detailCountReload; i += 1) {
      detailSrcsReload.push((await detailImgsReload.nth(i).getAttribute('src')) || '');
    }
    evidence.detailSrcsAfterReload = detailSrcsReload;
    evidence.detailHasBlobAfterReload = detailSrcsReload.some((s) => s.startsWith('blob:'));
    console.log('DETAIL SRCS AFTER RELOAD:', JSON.stringify(detailSrcsReload));

    expect(evidence.existingImageIsBlob).toBe(false);
    expect(detailCount).toBe(2);
    expect(detailCountReload).toBe(2);
    expect(evidence.detailHasBlob).toBe(false);
    expect(evidence.detailHasBlobAfterReload).toBe(false);

    console.log('EVIDENCE:', JSON.stringify(evidence, null, 2));
  });
});
