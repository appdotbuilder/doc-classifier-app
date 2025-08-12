import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all categories ordered by creation date (newest first)
    const results = await db.select()
      .from(categoriesTable)
      .orderBy(categoriesTable.created_at)
      .execute();

    // Return categories as-is since all fields are already in the correct format
    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};