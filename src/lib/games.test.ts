import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
} from './games';

/** Identyfikatory fixture'ów używanych do sprawdzania filtrów. */
interface FilteredGameIds {
    strategia: number;
    logika: number;
    wydawcaJeden: number;
    wydawcaDwa: number;
}

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategia', description: 'kat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });

    // Wstawiamy tytuły w odwrotnej kolejności alfabetycznej, żeby sprawdzić sortowanie.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Gra ${String(i).padStart(2, '0')}`,
            description: `Opis ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

/** Zasila bazę minimalnym zestawem gier o różnych kategoriach i wydawcach. */
async function seedFilteredGames(db: Database): Promise<FilteredGameIds> {
    const [strategia] = await db.insert(categories).values({ name: 'Strategia', description: 'kat' }).returning({ id: categories.id });
    const [logika] = await db.insert(categories).values({ name: 'Logika', description: 'kat' }).returning({ id: categories.id });
    const [wydawcaJeden] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });
    const [wydawcaDwa] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Dwa', description: 'wyd' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        { title: 'Abyss of Logic', description: 'Opis 1', starRating: 4.5, categoryId: strategia.id, publisherId: wydawcaJeden.id },
        { title: 'Crown Tactics', description: 'Opis 2', starRating: 4.2, categoryId: logika.id, publisherId: wydawcaDwa.id },
        { title: 'Maze Program', description: 'Opis 3', starRating: 3.8, categoryId: strategia.id, publisherId: wydawcaDwa.id },
        { title: 'Puzzle Frontier', description: 'Opis 4', starRating: 4.8, categoryId: logika.id, publisherId: wydawcaJeden.id },
    ]);

    return {
        strategia: strategia.id,
        logika: logika.id,
        wydawcaJeden: wydawcaJeden.id,
        wydawcaDwa: wydawcaDwa.id,
    };
}

describe('helpery dostępu do danych o grach', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('zwraca wszystkie gry posortowane po tytule', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Gra 01', 'Gra 02', 'Gra 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategia' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Wydawca Jeden' });
    });

    it('zwraca identyfikatory wszystkich gier posortowane po tytule', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('pobiera pojedynczą grę po id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Gra 01');
    });

    it('zwraca null dla nieistniejącej gry', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filtruje gry po jednej kategorii', async () => {
        const ids = await seedFilteredGames(db);
        const games = await getAllGames(db, { categoryIds: [ids.strategia] });

        expect(games.map((game) => game.title)).toEqual(['Abyss of Logic', 'Maze Program']);
    });

    it('filtruje gry po wydawcy', async () => {
        const ids = await seedFilteredGames(db);
        const games = await getAllGames(db, { publisherIds: [ids.wydawcaDwa] });

        expect(games.map((game) => game.title)).toEqual(['Crown Tactics', 'Maze Program']);
    });

    it('łączy filtry kategorii i wydawcy', async () => {
        const ids = await seedFilteredGames(db);
        const games = await getAllGames(db, { categoryIds: [ids.strategia], publisherIds: [ids.wydawcaDwa] });

        expect(games.map((game) => game.title)).toEqual(['Maze Program']);
    });

    it('łączy wiele kategorii alternatywnie i zachowuje kolejność tytułów', async () => {
        const ids = await seedFilteredGames(db);
        const games = await getAllGames(db, { categoryIds: [ids.strategia, ids.logika] });

        expect(games.map((game) => game.title)).toEqual([
            'Abyss of Logic',
            'Crown Tactics',
            'Maze Program',
            'Puzzle Frontier',
        ]);
    });

    it('zwraca pustą listę, gdy filtr nie pasuje do żadnej gry', async () => {
        await seedFilteredGames(db);

        await expect(getAllGames(db, { categoryIds: [99999] })).resolves.toEqual([]);
    });

    it('zwraca listę kategorii i wydawców posortowanych alfabetycznie', async () => {
        await seedFilteredGames(db);
        await expect(getAllCategories(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Logika' },
            { id: expect.any(Number), name: 'Strategia' },
        ]);
        await expect(getAllPublishers(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Wydawca Dwa' },
            { id: expect.any(Number), name: 'Wydawca Jeden' },
        ]);
    });
});
