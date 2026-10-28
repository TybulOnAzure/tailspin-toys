import { test, expect } from '@playwright/test';

test.describe('Filtrowanie gier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('games-grid')).toBeVisible();
  });

  test('pozwala filtrować gry po jednej kategorii', async ({ page }) => {
    await test.step('Wybierz kategorię „Strategia”', async () => {
      await page.getByLabel('Filtruj po kategorii Strategia').check();
    });

    await test.step('Sprawdź, że widoczne są tylko gry z tej kategorii', async () => {
      const visibleCards = page.locator('[data-testid="game-card"]:visible');
      await expect(visibleCards).not.toHaveCount(0);

      await expect(page.getByTestId('games-results-summary')).toHaveText('Wyświetlono 4 gry z 21 gier.');
      const categories = await visibleCards.getByTestId('game-category').allTextContents();
      expect(categories.every((category) => category === 'Strategia')).toBeTruthy();
    });
  });

  test('łączy wiele wybranych kategorii', async ({ page }) => {
    await test.step('Wybierz dwie kategorie', async () => {
      await page.getByLabel('Filtruj po kategorii Strategia').check();
      await page.getByLabel('Filtruj po kategorii Łamigłówki').check();
    });

    await test.step('Sprawdź, że wyniki zawierają obie kategorie', async () => {
      const visibleCards = page.locator('[data-testid="game-card"]:visible');
      await expect(visibleCards).not.toHaveCount(0);

      const categories = await visibleCards.getByTestId('game-category').allTextContents();
      expect(categories.every((category) => ['Strategia', 'Łamigłówki'].includes(category))).toBeTruthy();
      expect(categories).toContain('Strategia');
      expect(categories).toContain('Łamigłówki');
    });
  });

  test('filtruje gry wyłącznie po wydawcy', async ({ page }) => {
    await test.step('Wybierz wydawcę CodeForge Studios', async () => {
      await page.getByLabel('Filtruj po wydawcy').selectOption({ label: 'CodeForge Studios' });
    });

    await test.step('Sprawdź, że każda widoczna gra ma wybranego wydawcę', async () => {
      const visibleCards = page.locator('[data-testid="game-card"]:visible');
      await expect(visibleCards).not.toHaveCount(0);

      const publishers = await visibleCards.getByTestId('game-publisher').allTextContents();
      expect(publishers.every((publisher) => publisher === 'CodeForge Studios')).toBeTruthy();
    });
  });

  test('pozwala filtrować gry po wydawcy i łączyć filtry z kategorią', async ({ page }) => {
    await test.step('Wybierz kategorię i wydawcę', async () => {
      await page.getByLabel('Filtruj po kategorii Strategia').check();
      await page.getByTestId('publisher-filter').selectOption({ label: 'CodeForge Studios' });
    });

    await test.step('Sprawdź, że wynik jest złożonym filtrem', async () => {
      const visibleCards = page.locator('[data-testid="game-card"]:visible');
      await expect(visibleCards).not.toHaveCount(0);

      const cards = await visibleCards.allTextContents();
      expect(cards.every((text) => text.includes('Strategia') && text.includes('CodeForge Studios'))).toBeTruthy();
      await expect(page.getByTestId('games-results-summary')).toHaveText('Wyświetlono 1 grę z 21 gier.');
    });
  });

  test('umożliwia wyczyszczenie filtrów', async ({ page }) => {
    await page.getByLabel('Filtruj po kategorii Strategia').check();
    await page.getByLabel('Filtruj po kategorii Łamigłówki').check();
    await page.getByTestId('publisher-filter').selectOption({ label: 'CodeForge Studios' });

    await page.getByTestId('clear-filters').click();

    await expect(page.getByTestId('publisher-filter')).toHaveValue('');
    const checkboxes = page.getByTestId('category-filter-checkbox');
    const checkboxCount = await checkboxes.count();
    for (let index = 0; index < checkboxCount; index += 1) {
      await expect(checkboxes.nth(index)).not.toBeChecked();
    }

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(await page.getByTestId('game-card').count());
  });
});
