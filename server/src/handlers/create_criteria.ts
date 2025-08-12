import { db } from '../db';
import { criteriaTable, categoriesTable } from '../db/schema';
import { type CreateCriteriaInput, type Criteria } from '../schema';
import { eq } from 'drizzle-orm';

export const createCriteria = async (input: CreateCriteriaInput): Promise<Criteria> => {
  try {
    // Verify that the referenced category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // Insert criteria record
    const result = await db.insert(criteriaTable)
      .values({
        category_id: input.category_id,
        name: input.name,
        pattern: input.pattern,
        weight: input.weight.toString(), // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const criteria = result[0];
    return {
      ...criteria,
      weight: parseFloat(criteria.weight), // Convert string back to number
    };
  } catch (error) {
    console.error('Criteria creation failed:', error);
    throw error;
  }
};