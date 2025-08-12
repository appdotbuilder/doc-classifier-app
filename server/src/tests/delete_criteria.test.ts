import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, criteriaTable } from '../db/schema';
import { deleteCriteria } from '../handlers/delete_criteria';
import { eq } from 'drizzle-orm';

describe('deleteCriteria', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete existing criteria and return true', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'Test category for criteria deletion'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create criteria to delete
    const criteriaResult = await db.insert(criteriaTable)
      .values({
        category_id: category.id,
        name: 'Test Criteria',
        pattern: 'test.*pattern',
        weight: '0.75'
      })
      .returning()
      .execute();

    const criteria = criteriaResult[0];

    // Delete the criteria
    const result = await deleteCriteria(criteria.id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify criteria was actually deleted from database
    const remainingCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteria.id))
      .execute();

    expect(remainingCriteria).toHaveLength(0);
  });

  it('should return false when criteria does not exist', async () => {
    // Try to delete non-existent criteria
    const result = await deleteCriteria(999999);

    // Should return false for non-existent criteria
    expect(result).toBe(false);
  });

  it('should not affect other criteria when deleting specific one', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#00FF00',
        description: 'Test category for multiple criteria'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create multiple criteria
    const criteria1Result = await db.insert(criteriaTable)
      .values({
        category_id: category.id,
        name: 'Criteria One',
        pattern: 'pattern.*one',
        weight: '0.60'
      })
      .returning()
      .execute();

    const criteria2Result = await db.insert(criteriaTable)
      .values({
        category_id: category.id,
        name: 'Criteria Two',
        pattern: 'pattern.*two',
        weight: '0.80'
      })
      .returning()
      .execute();

    const criteria1 = criteria1Result[0];
    const criteria2 = criteria2Result[0];

    // Delete only the first criteria
    const result = await deleteCriteria(criteria1.id);

    expect(result).toBe(true);

    // Verify first criteria was deleted
    const deletedCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteria1.id))
      .execute();

    expect(deletedCriteria).toHaveLength(0);

    // Verify second criteria still exists
    const remainingCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteria2.id))
      .execute();

    expect(remainingCriteria).toHaveLength(1);
    expect(remainingCriteria[0].name).toEqual('Criteria Two');
    expect(remainingCriteria[0].pattern).toEqual('pattern.*two');
    expect(parseFloat(remainingCriteria[0].weight)).toEqual(0.80);
  });

  it('should handle deletion of criteria with different weights', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Weight Test Category',
        color: '#0000FF',
        description: 'Category for testing criteria with different weights'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create criteria with specific weight
    const criteriaResult = await db.insert(criteriaTable)
      .values({
        category_id: category.id,
        name: 'High Weight Criteria',
        pattern: 'important.*document',
        weight: '0.95'
      })
      .returning()
      .execute();

    const criteria = criteriaResult[0];

    // Delete the criteria
    const result = await deleteCriteria(criteria.id);

    expect(result).toBe(true);

    // Verify deletion succeeded
    const remainingCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, criteria.id))
      .execute();

    expect(remainingCriteria).toHaveLength(0);
  });
});