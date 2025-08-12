import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, criteriaTable, classificationResultsTable, documentsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a category successfully', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should return false when deleting non-existent category', async () => {
    const result = await deleteCategory(999999);
    expect(result).toBe(false);
  });

  it('should cascade delete related criteria', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create related criteria
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categoryId,
          name: 'Test Criteria 1',
          pattern: 'test.*pattern',
          weight: '0.75'
        },
        {
          category_id: categoryId,
          name: 'Test Criteria 2',
          pattern: 'another.*pattern',
          weight: '0.50'
        }
      ])
      .execute();

    // Verify criteria exist before deletion
    const criteriaBeforeDeletion = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.category_id, categoryId))
      .execute();

    expect(criteriaBeforeDeletion).toHaveLength(2);

    // Delete the category
    const result = await deleteCategory(categoryId);
    expect(result).toBe(true);

    // Verify criteria were deleted
    const criteriaAfterDeletion = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.category_id, categoryId))
      .execute();

    expect(criteriaAfterDeletion).toHaveLength(0);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should cascade delete related classification results', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'Test document content'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    // Create related classification results
    await db.insert(classificationResultsTable)
      .values([
        {
          document_id: documentId,
          category_id: categoryId,
          confidence_level: 'high',
          confidence_score: '0.950',
          classification_method: 'pattern_matching',
          matched_criteria: '["test criteria 1"]'
        },
        {
          document_id: documentId,
          category_id: categoryId,
          confidence_level: 'medium',
          confidence_score: '0.750',
          classification_method: 'pattern_matching',
          matched_criteria: '["test criteria 2"]'
        }
      ])
      .execute();

    // Verify classification results exist before deletion
    const resultsBeforeDeletion = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.category_id, categoryId))
      .execute();

    expect(resultsBeforeDeletion).toHaveLength(2);

    // Delete the category
    const result = await deleteCategory(categoryId);
    expect(result).toBe(true);

    // Verify classification results were deleted
    const resultsAfterDeletion = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.category_id, categoryId))
      .execute();

    expect(resultsAfterDeletion).toHaveLength(0);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);

    // Verify document still exists (should not be cascade deleted)
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(documents).toHaveLength(1);
  });

  it('should cascade delete all related data in correct order', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'Test document content'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    // Create related criteria
    await db.insert(criteriaTable)
      .values({
        category_id: categoryId,
        name: 'Test Criteria',
        pattern: 'test.*pattern',
        weight: '0.75'
      })
      .execute();

    // Create related classification results
    await db.insert(classificationResultsTable)
      .values({
        document_id: documentId,
        category_id: categoryId,
        confidence_level: 'high',
        confidence_score: '0.950',
        classification_method: 'pattern_matching',
        matched_criteria: '["test criteria"]'
      })
      .execute();

    // Verify all data exists before deletion
    const categoriesBeforeDeletion = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();
    expect(categoriesBeforeDeletion).toHaveLength(1);

    const criteriaBeforeDeletion = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.category_id, categoryId))
      .execute();
    expect(criteriaBeforeDeletion).toHaveLength(1);

    const resultsBeforeDeletion = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.category_id, categoryId))
      .execute();
    expect(resultsBeforeDeletion).toHaveLength(1);

    // Delete the category
    const result = await deleteCategory(categoryId);
    expect(result).toBe(true);

    // Verify all related data was deleted
    const categoriesAfterDeletion = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();
    expect(categoriesAfterDeletion).toHaveLength(0);

    const criteriaAfterDeletion = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.category_id, categoryId))
      .execute();
    expect(criteriaAfterDeletion).toHaveLength(0);

    const resultsAfterDeletion = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.category_id, categoryId))
      .execute();
    expect(resultsAfterDeletion).toHaveLength(0);
  });

  it('should handle deletion when category has no related data', async () => {
    // Create a test category with no related data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Isolated Category',
        color: '#00FF00',
        description: 'A category with no relations'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);
    expect(result).toBe(true);

    // Verify category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });
});