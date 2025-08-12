import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { criteriaTable, categoriesTable } from '../db/schema';
import { type UpdateCriteriaInput, type CreateCategoryInput } from '../schema';
import { updateCriteria } from '../handlers/update_criteria';
import { eq } from 'drizzle-orm';

describe('updateCriteria', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let categoryId: number;
  let criteriaId: number;
  let secondCategoryId: number;

  beforeEach(async () => {
    // Create test categories
    const category: CreateCategoryInput = {
      name: 'Test Category',
      color: '#FF5733',
      description: 'A test category'
    };

    const categoryResult = await db.insert(categoriesTable)
      .values(category)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const secondCategory: CreateCategoryInput = {
      name: 'Second Category',
      color: '#33FF57',
      description: 'Another test category'
    };

    const secondCategoryResult = await db.insert(categoriesTable)
      .values(secondCategory)
      .returning()
      .execute();
    secondCategoryId = secondCategoryResult[0].id;

    // Create test criteria
    const criteriaResult = await db.insert(criteriaTable)
      .values({
        category_id: categoryId,
        name: 'Original Criteria',
        pattern: 'original.*pattern',
        weight: '0.75' // String for numeric column
      })
      .returning()
      .execute();
    criteriaId = criteriaResult[0].id;
  });

  it('should update criteria name', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      name: 'Updated Criteria Name'
    };

    const result = await updateCriteria(input);

    expect(result.id).toEqual(criteriaId);
    expect(result.name).toEqual('Updated Criteria Name');
    expect(result.pattern).toEqual('original.*pattern'); // Unchanged
    expect(result.weight).toEqual(0.75); // Unchanged
    expect(result.category_id).toEqual(categoryId); // Unchanged
    expect(typeof result.weight).toBe('number'); // Type check
  });

  it('should update criteria pattern', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      pattern: 'updated.*pattern'
    };

    const result = await updateCriteria(input);

    expect(result.id).toEqual(criteriaId);
    expect(result.pattern).toEqual('updated.*pattern');
    expect(result.name).toEqual('Original Criteria'); // Unchanged
    expect(result.weight).toEqual(0.75); // Unchanged
    expect(result.category_id).toEqual(categoryId); // Unchanged
  });

  it('should update criteria weight', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      weight: 0.25
    };

    const result = await updateCriteria(input);

    expect(result.id).toEqual(criteriaId);
    expect(result.weight).toEqual(0.25);
    expect(result.name).toEqual('Original Criteria'); // Unchanged
    expect(result.pattern).toEqual('original.*pattern'); // Unchanged
    expect(result.category_id).toEqual(categoryId); // Unchanged
    expect(typeof result.weight).toBe('number'); // Type check
  });

  it('should update criteria category assignment', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      category_id: secondCategoryId
    };

    const result = await updateCriteria(input);

    expect(result.id).toEqual(criteriaId);
    expect(result.category_id).toEqual(secondCategoryId);
    expect(result.name).toEqual('Original Criteria'); // Unchanged
    expect(result.pattern).toEqual('original.*pattern'); // Unchanged
    expect(result.weight).toEqual(0.75); // Unchanged
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      name: 'Completely Updated Criteria',
      pattern: 'new.*updated.*pattern',
      weight: 0.9,
      category_id: secondCategoryId
    };

    const result = await updateCriteria(input);

    expect(result.id).toEqual(criteriaId);
    expect(result.name).toEqual('Completely Updated Criteria');
    expect(result.pattern).toEqual('new.*updated.*pattern');
    expect(result.weight).toEqual(0.9);
    expect(result.category_id).toEqual(secondCategoryId);
    expect(typeof result.weight).toBe('number'); // Type check
  });

  it('should save updated criteria to database', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      name: 'Database Test Update',
      weight: 0.3
    };

    await updateCriteria(input);

    // Verify changes were persisted
    const savedCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteriaId))
      .execute();

    expect(savedCriteria).toHaveLength(1);
    expect(savedCriteria[0].name).toEqual('Database Test Update');
    expect(parseFloat(savedCriteria[0].weight)).toEqual(0.3);
    expect(savedCriteria[0].pattern).toEqual('original.*pattern'); // Unchanged
  });

  it('should throw error when criteria does not exist', async () => {
    const input: UpdateCriteriaInput = {
      id: 99999,
      name: 'Non-existent Update'
    };

    expect(updateCriteria(input)).rejects.toThrow(/criteria with id 99999 not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const input: UpdateCriteriaInput = {
      id: criteriaId,
      category_id: 99999
    };

    expect(updateCriteria(input)).rejects.toThrow(/category with id 99999 not found/i);
  });

  it('should handle edge case weight values', async () => {
    // Test minimum weight
    const minInput: UpdateCriteriaInput = {
      id: criteriaId,
      weight: 0
    };

    const minResult = await updateCriteria(minInput);
    expect(minResult.weight).toEqual(0);
    expect(typeof minResult.weight).toBe('number');

    // Test maximum weight
    const maxInput: UpdateCriteriaInput = {
      id: criteriaId,
      weight: 1
    };

    const maxResult = await updateCriteria(maxInput);
    expect(maxResult.weight).toEqual(1);
    expect(typeof maxResult.weight).toBe('number');
  });

  it('should preserve created_at timestamp', async () => {
    // Get original created_at
    const originalCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteriaId))
      .execute();

    const originalCreatedAt = originalCriteria[0].created_at;

    const input: UpdateCriteriaInput = {
      id: criteriaId,
      name: 'Timestamp Preservation Test'
    };

    const result = await updateCriteria(input);

    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});