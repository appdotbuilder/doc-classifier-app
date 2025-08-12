import { db } from '../db';
import { criteriaTable, categoriesTable } from '../db/schema';
import { type CriteriaListResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCriteria(): Promise<CriteriaListResponse> {
  try {
    // Join criteria with categories to get category details
    const results = await db.select({
      id: criteriaTable.id,
      category_id: criteriaTable.category_id,
      category_name: categoriesTable.name,
      category_color: categoriesTable.color,
      name: criteriaTable.name,
      pattern: criteriaTable.pattern,
      weight: criteriaTable.weight,
      created_at: criteriaTable.created_at,
    })
      .from(criteriaTable)
      .innerJoin(categoriesTable, eq(criteriaTable.category_id, categoriesTable.id))
      .execute();

    // Convert numeric weight field to number
    const criteria = results.map(result => ({
      ...result,
      weight: parseFloat(result.weight), // Convert numeric string to number
    }));

    return {
      criteria,
    };
  } catch (error) {
    console.error('Failed to fetch criteria:', error);
    throw error;
  }
}