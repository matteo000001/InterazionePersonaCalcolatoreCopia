import { test, expect } from '@playwright/test';

test('un utente non autenticato viene portato al login', async ({ page }) => {
  await page.goto('/');

  // Senza una sessione valida si arriva sempre alla pagina di accesso.
  expect(await page.locator('h1').innerText()).toContain('Accedi al portale');
});
