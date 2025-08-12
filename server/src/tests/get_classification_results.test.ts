import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, criteriaTable, documentsTable, classificationResultsTable } from '../db/schema';
import { getClassificationResults } from '../handlers/get_classification_results';
import { eq } from 'drizzle-orm';

describe('getClassificationResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no classification results exist', async () => {
    const results = await getClassificationResults();
    
    expect(results).toEqual([]);
  });

  it('should return all classification results', async () => {
    // Create prerequisite data - category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000',
        description: 'Test category description'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'Test document content'
      })
      .returning()
      .execute();
    const document = documentResult[0];

    // Create classification results
    const result1 = await db.insert(classificationResultsTable)
      .values({
        document_id: document.id,
        category_id: category.id,
        confidence_level: 'high',
        confidence_score: '0.950',
        classification_method: 'keyword_matching',
        matched_criteria: JSON.stringify(['keyword1', 'keyword2'])
      })
      .returning()
      .execute();

    const result2 = await db.insert(classificationResultsTable)
      .values({
        document_id: document.id,
        category_id: category.id,
        confidence_level: 'medium',
        confidence_score: '0.750',
        classification_method: 'pattern_matching',
        matched_criteria: JSON.stringify(['pattern1'])
      })
      .returning()
      .execute();

    const results = await getClassificationResults();

    expect(results).toHaveLength(2);
    
    // Check first result
    const firstResult = results.find(r => r.id === result1[0].id);
    expect(firstResult).toBeDefined();
    expect(firstResult!.document_id).toEqual(document.id);
    expect(firstResult!.category_id).toEqual(category.id);
    expect(firstResult!.confidence_level).toEqual('high');
    expect(firstResult!.confidence_score).toEqual(0.950);
    expect(typeof firstResult!.confidence_score).toBe('number');
    expect(firstResult!.classification_method).toEqual('keyword_matching');
    expect(firstResult!.matched_criteria).toEqual(['keyword1', 'keyword2']);
    expect(Array.isArray(firstResult!.matched_criteria)).toBe(true);
    expect(firstResult!.classified_at).toBeInstanceOf(Date);

    // Check second result
    const secondResult = results.find(r => r.id === result2[0].id);
    expect(secondResult).toBeDefined();
    expect(secondResult!.document_id).toEqual(document.id);
    expect(secondResult!.category_id).toEqual(category.id);
    expect(secondResult!.confidence_level).toEqual('medium');
    expect(secondResult!.confidence_score).toEqual(0.750);
    expect(typeof secondResult!.confidence_score).toBe('number');
    expect(secondResult!.classification_method).toEqual('pattern_matching');
    expect(secondResult!.matched_criteria).toEqual(['pattern1']);
    expect(Array.isArray(secondResult!.matched_criteria)).toBe(true);
    expect(secondResult!.classified_at).toBeInstanceOf(Date);
  });

  it('should handle different confidence levels correctly', async () => {
    // Create prerequisite data - category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#00FF00',
        description: 'Test category'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'confidence_test.txt',
        file_type: 'txt',
        file_size: 512,
        content: 'Confidence test content'
      })
      .returning()
      .execute();
    const document = documentResult[0];

    // Create classification results with different confidence levels
    await db.insert(classificationResultsTable)
      .values([
        {
          document_id: document.id,
          category_id: category.id,
          confidence_level: 'low',
          confidence_score: '0.250',
          classification_method: 'basic_matching',
          matched_criteria: JSON.stringify(['low_confidence_match'])
        },
        {
          document_id: document.id,
          category_id: category.id,
          confidence_level: 'medium',
          confidence_score: '0.650',
          classification_method: 'moderate_matching',
          matched_criteria: JSON.stringify(['medium_match1', 'medium_match2'])
        },
        {
          document_id: document.id,
          category_id: category.id,
          confidence_level: 'high',
          confidence_score: '0.900',
          classification_method: 'advanced_matching',
          matched_criteria: JSON.stringify(['high_match1', 'high_match2', 'high_match3'])
        }
      ])
      .execute();

    const results = await getClassificationResults();

    expect(results).toHaveLength(3);
    
    // Verify each confidence level is present
    const confidenceLevels = results.map(r => r.confidence_level);
    expect(confidenceLevels).toContain('low');
    expect(confidenceLevels).toContain('medium');
    expect(confidenceLevels).toContain('high');

    // Verify confidence scores are properly converted to numbers
    const lowConfidenceResult = results.find(r => r.confidence_level === 'low');
    const mediumConfidenceResult = results.find(r => r.confidence_level === 'medium');
    const highConfidenceResult = results.find(r => r.confidence_level === 'high');

    expect(lowConfidenceResult!.confidence_score).toEqual(0.250);
    expect(typeof lowConfidenceResult!.confidence_score).toBe('number');
    expect(mediumConfidenceResult!.confidence_score).toEqual(0.650);
    expect(typeof mediumConfidenceResult!.confidence_score).toBe('number');
    expect(highConfidenceResult!.confidence_score).toEqual(0.900);
    expect(typeof highConfidenceResult!.confidence_score).toBe('number');
  });

  it('should verify results are saved to database correctly', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Database Test Category',
        color: '#0000FF',
        description: 'For database testing'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'database_test.docx',
        file_type: 'docx',
        file_size: 2048,
        content: 'Database test content'
      })
      .returning()
      .execute();
    const document = documentResult[0];

    // Insert classification result
    const insertedResult = await db.insert(classificationResultsTable)
      .values({
        document_id: document.id,
        category_id: category.id,
        confidence_level: 'high',
        confidence_score: '0.850',
        classification_method: 'database_test_method',
        matched_criteria: JSON.stringify(['db_test1', 'db_test2'])
      })
      .returning()
      .execute();

    // Verify through handler
    const handlerResults = await getClassificationResults();
    expect(handlerResults).toHaveLength(1);
    
    const result = handlerResults[0];
    expect(result.id).toEqual(insertedResult[0].id);

    // Verify through direct database query
    const dbResults = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.id, insertedResult[0].id))
      .execute();

    expect(dbResults).toHaveLength(1);
    expect(dbResults[0].document_id).toEqual(document.id);
    expect(dbResults[0].category_id).toEqual(category.id);
    expect(dbResults[0].confidence_level).toEqual('high');
    expect(parseFloat(dbResults[0].confidence_score)).toEqual(0.850);
    expect(dbResults[0].classification_method).toEqual('database_test_method');
    expect(JSON.parse(dbResults[0].matched_criteria)).toEqual(['db_test1', 'db_test2']);
    expect(dbResults[0].classified_at).toBeInstanceOf(Date);
  });

  it('should handle empty matched_criteria arrays correctly', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Empty Criteria Category',
        color: '#FFFF00',
        description: 'For empty criteria testing'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'empty_criteria.pdf',
        file_type: 'pdf',
        file_size: 256,
        content: 'Empty criteria test'
      })
      .returning()
      .execute();
    const document = documentResult[0];

    // Create result with empty matched_criteria
    await db.insert(classificationResultsTable)
      .values({
        document_id: document.id,
        category_id: category.id,
        confidence_level: 'low',
        confidence_score: '0.100',
        classification_method: 'no_match_method',
        matched_criteria: JSON.stringify([])
      })
      .execute();

    const results = await getClassificationResults();

    expect(results).toHaveLength(1);
    expect(results[0].matched_criteria).toEqual([]);
    expect(Array.isArray(results[0].matched_criteria)).toBe(true);
    expect(results[0].matched_criteria).toHaveLength(0);
  });
});