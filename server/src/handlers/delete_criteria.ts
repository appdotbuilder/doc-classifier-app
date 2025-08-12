import { db } from '../db';
import { criteriaTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCriteria = async (criteriaId: number): Promise<boolean> => {
  try {
    // Delete the criteria record
    const result = await db.delete(criteriaTable)
      .where(eq(criteriaTable.id, criteriaId))
      .execute();

    // Check if any rows were affected (criteria existed and was deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Criteria deletion failed:', error);
    throw error;
  }
};