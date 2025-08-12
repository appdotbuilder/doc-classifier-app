import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { criteriaTable, categoriesTable } from '../db/schema';
import { type CreateCriteriaInput } from '../schema';
import { createCriteria } from '../handlers/create_criteria';
import { eq } from 'drizzle-orm';

describe('createCriteria', () => {
  let testCategoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test category first (required for foreign key)
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF5733',
        description: 'A category for testing',
      })
      .returning()
      .execute();
    
    testCategoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  // Simple test input
  const getTestInput = (): CreateCriteriaInput => ({
    category_id: testCategoryId,
    name: 'Test Criteria',
    pattern: 'invoice|receipt|bill',
    weight: 0.75,
  });

  it('should create a criteria', async () => {
    const testInput = getTestInput();
    const result = await createCriteria(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Criteria');
    expect(result.pattern).toEqual('invoice|receipt|bill');
    expect(result.weight).toEqual(0.75);
    expect(typeof result.weight).toEqual('number');
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save criteria to database', async () => {
    const testInput = getTestInput();
    const result = await createCriteria(testInput);

    // Query using proper drizzle syntax
    const criteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, result.id))
      .execute();

    expect(criteria).toHaveLength(1);
    expect(criteria[0].name).toEqual('Test Criteria');
    expect(criteria[0].pattern).toEqual('invoice|receipt|bill');
    expect(parseFloat(criteria[0].weight)).toEqual(0.75);
    expect(criteria[0].category_id).toEqual(testCategoryId);
    expect(criteria[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different pattern types', async () => {
    const regexInput = {
      ...getTestInput(),
      name: 'Regex Criteria',
      pattern: '^\\d{3}-\\d{3}-\\d{4}$', // Phone number pattern
      weight: 0.9,
    };

    const result = await createCriteria(regexInput);

    expect(result.name).toEqual('Regex Criteria');
    expect(result.pattern).toEqual('^\\d{3}-\\d{3}-\\d{4}$');
    expect(result.weight).toEqual(0.9);
  });

  it('should handle edge case weights', async () => {
    // Test minimum weight
    const minWeightInput = {
      ...getTestInput(),
      name: 'Min Weight Criteria',
      weight: 0.0,
    };

    const minResult = await createCriteria(minWeightInput);
    expect(minResult.weight).toEqual(0.0);

    // Test maximum weight
    const maxWeightInput = {
      ...getTestInput(),
      name: 'Max Weight Criteria',
      weight: 1.0,
    };

    const maxResult = await createCriteria(maxWeightInput);
    expect(maxResult.weight).toEqual(1.0);
  });

  it('should throw error when category does not exist', async () => {
    const invalidInput = {
      ...getTestInput(),
      category_id: 99999, // Non-existent category ID
    };

    await expect(createCriteria(invalidInput)).rejects.toThrow(/Category with id 99999 does not exist/);
  });

  it('should handle complex patterns with special characters', async () => {
    const complexInput = {
      ...getTestInput(),
      name: 'Complex Pattern',
      pattern: '(?i)(contract|agreement).*\\$[0-9,]+(\\.[0-9]{2})?',
      weight: 0.85,
    };

    const result = await createCriteria(complexInput);

    expect(result.name).toEqual('Complex Pattern');
    expect(result.pattern).toEqual('(?i)(contract|agreement).*\\$[0-9,]+(\\.[0-9]{2})?');
    expect(result.weight).toEqual(0.85);

    // Verify in database
    const saved = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, result.id))
      .execute();

    expect(saved[0].pattern).toEqual('(?i)(contract|agreement).*\\$[0-9,]+(\\.[0-9]{2})?');
  });
});