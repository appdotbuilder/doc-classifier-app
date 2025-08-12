import { db } from '../db';
import { categoriesTable, criteriaTable, classificationResultsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCategory(categoryId: number): Promise<boolean> {
  try {
    // First delete related classification results
    await db.delete(classificationResultsTable)
      .where(eq(classificationResultsTable.category_id, categoryId))
      .execute();

    // Then delete related criteria
    await db.delete(criteriaTable)
      .where(eq(criteriaTable.category_id, categoryId))
      .execute();

    // Finally delete the category itself
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    // Return true if at least one row was deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
}