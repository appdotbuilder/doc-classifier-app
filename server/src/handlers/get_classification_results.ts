import { db } from '../db';
import { classificationResultsTable } from '../db/schema';
import { type ClassificationResult } from '../schema';

export async function getClassificationResults(): Promise<ClassificationResult[]> {
  try {
    const results = await db.select()
      .from(classificationResultsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      ...result,
      confidence_score: parseFloat(result.confidence_score), // Convert string back to number
      matched_criteria: JSON.parse(result.matched_criteria) // Parse JSON string to array
    }));
  } catch (error) {
    console.error('Failed to get classification results:', error);
    throw error;
  }
}