import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UploadDocumentInput, type Document } from '../schema';

export const uploadDocument = async (input: UploadDocumentInput): Promise<Document> => {
  try {
    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        filename: input.filename,
        file_type: input.file_type,
        file_size: input.file_size,
        content: input.content || null, // Use provided content or null
      })
      .returning()
      .execute();

    // Return the created document
    const document = result[0];
    return {
      ...document,
      // Convert timestamp to Date object for consistency with schema
      uploaded_at: new Date(document.uploaded_at)
    };
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};