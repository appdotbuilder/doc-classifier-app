import { db } from '../db';
import { criteriaTable, categoriesTable } from '../db/schema';
import { type UpdateCriteriaInput, type Criteria } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCriteria = async (input: UpdateCriteriaInput): Promise<Criteria> => {
  try {
    // Check if criteria exists
    const existingCriteria = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.id, input.id))
      .execute();

    if (existingCriteria.length === 0) {
      throw new Error(`Criteria with id ${input.id} not found`);
    }

    // If category_id is being updated, verify the category exists
    if (input.category_id !== undefined) {
      const categoryExists = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.pattern !== undefined) {
      updateData.pattern = input.pattern;
    }
    if (input.weight !== undefined) {
      updateData.weight = input.weight.toString(); // Convert number to string for numeric column
    }

    // Update criteria record
    const result = await db.update(criteriaTable)
      .set(updateData)
      .where(eq(criteriaTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedCriteria = result[0];
    return {
      ...updatedCriteria,
      weight: parseFloat(updatedCriteria.weight) // Convert string back to number
    };
  } catch (error) {
    console.error('Criteria update failed:', error);
    throw error;
  }
};