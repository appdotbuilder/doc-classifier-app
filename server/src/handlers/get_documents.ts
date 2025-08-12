import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type Document } from '../schema';

export async function getDocuments(): Promise<Document[]> {
  try {
    const results = await db.select()
      .from(documentsTable)
      .execute();

    return results.map(doc => ({
      ...doc,
      // No numeric conversions needed for this table - all fields are integers, text, or timestamps
    }));
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    throw error;
  }
}