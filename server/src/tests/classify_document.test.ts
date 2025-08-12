import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, criteriaTable, documentsTable, classificationResultsTable } from '../db/schema';
import { type ClassifyDocumentInput } from '../schema';
import { classifyDocument } from '../handlers/classify_document';
import { eq } from 'drizzle-orm';

describe('classifyDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create categories
    const categories = await db.insert(categoriesTable)
      .values([
        {
          name: 'Business Documents',
          color: '#3B82F6',
          description: 'Business related documents'
        },
        {
          name: 'Legal Documents',
          color: '#EF4444',
          description: 'Legal contracts and agreements'
        },
        {
          name: 'Technical Documents',
          color: '#10B981',
          description: 'Technical specifications and manuals'
        }
      ])
      .returning()
      .execute();

    // Create criteria for Business Documents
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categories[0].id,
          name: 'Business Keywords',
          pattern: 'business|company|corporate|enterprise',
          weight: '0.80'
        },
        {
          category_id: categories[0].id,
          name: 'Financial Terms',
          pattern: 'revenue|profit|budget|financial',
          weight: '0.70'
        }
      ])
      .execute();

    // Create criteria for Legal Documents
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categories[1].id,
          name: 'Legal Keywords',
          pattern: 'contract|agreement|legal|clause',
          weight: '0.90'
        },
        {
          category_id: categories[1].id,
          name: 'Legal Entities',
          pattern: 'party|parties|defendant|plaintiff',
          weight: '0.60'
        }
      ])
      .execute();

    // Create criteria for Technical Documents
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categories[2].id,
          name: 'Technical Keywords',
          pattern: 'technical|specification|manual|documentation',
          weight: '0.85'
        }
      ])
      .execute();

    // Create test documents
    const documents = await db.insert(documentsTable)
      .values([
        {
          filename: 'business_plan.pdf',
          file_type: 'pdf',
          file_size: 2048,
          content: 'This is a comprehensive business plan for our company. It includes revenue projections and financial analysis for the corporate structure.'
        },
        {
          filename: 'legal_contract.pdf',
          file_type: 'pdf',
          file_size: 1536,
          content: 'This legal agreement between the parties outlines the contract terms and conditions. Both parties agree to the specified clauses.'
        },
        {
          filename: 'tech_manual.pdf',
          file_type: 'pdf',
          file_size: 3072,
          content: 'Technical specification document for the system. This manual provides detailed documentation for implementation.'
        },
        {
          filename: 'no_content.pdf',
          file_type: 'pdf',
          file_size: 512,
          content: null
        }
      ])
      .returning()
      .execute();

    return { categories, documents };
  };

  it('should classify business document with high confidence', async () => {
    const { documents } = await createTestData();
    const businessDoc = documents[0];

    const input: ClassifyDocumentInput = {
      document_id: businessDoc.id
    };

    const result = await classifyDocument(input);

    // Verify document info
    expect(result.document.id).toBe(businessDoc.id);
    expect(result.document.filename).toBe('business_plan.pdf');
    expect(result.document.file_type).toBe('pdf');
    expect(result.document.file_size).toBe(2048);
    expect(result.document.content).toContain('business plan');

    // Verify classification result
    expect(result.result.document_id).toBe(businessDoc.id);
    expect(result.result.confidence_level).toBe('medium'); // 0.80 + 0.70 = 1.50, which is medium
    expect(result.result.confidence_score).toBeGreaterThan(0);
    expect(result.result.classification_method).toBe('Pattern Matching');
    expect(Array.isArray(result.result.matched_criteria)).toBe(true);
    expect(result.result.matched_criteria.length).toBeGreaterThan(0);
    expect(result.result.classified_at).toBeInstanceOf(Date);

    // Verify category
    expect(result.category.name).toBe('Business Documents');
    expect(result.category.color).toBe('#3B82F6');
    expect(result.category.description).toBe('Business related documents');

    // Verify matched criteria details
    expect(Array.isArray(result.matched_criteria_details)).toBe(true);
    expect(result.matched_criteria_details.length).toBeGreaterThan(0);
    result.matched_criteria_details.forEach(criteria => {
      expect(criteria.id).toBeDefined();
      expect(criteria.name).toBeDefined();
      expect(criteria.pattern).toBeDefined();
      expect(typeof criteria.weight).toBe('number');
    });
  });

  it('should classify legal document correctly', async () => {
    const { documents } = await createTestData();
    const legalDoc = documents[1];

    const input: ClassifyDocumentInput = {
      document_id: legalDoc.id
    };

    const result = await classifyDocument(input);

    // Verify category is Legal Documents
    expect(result.category.name).toBe('Legal Documents');
    expect(result.category.color).toBe('#EF4444');

    // Verify high confidence due to multiple matches
    expect(result.result.confidence_level).toBe('medium'); // 0.90 + 0.60 = 1.50
    expect(result.result.confidence_score).toBeGreaterThan(0.4);

    // Verify matched criteria include legal terms
    expect(result.result.matched_criteria).toContain('Legal Keywords');
    expect(result.result.matched_criteria).toContain('Legal Entities');
  });

  it('should classify technical document correctly', async () => {
    const { documents } = await createTestData();
    const techDoc = documents[2];

    const input: ClassifyDocumentInput = {
      document_id: techDoc.id
    };

    const result = await classifyDocument(input);

    // Verify category is Technical Documents
    expect(result.category.name).toBe('Technical Documents');
    expect(result.category.color).toBe('#10B981');

    // Verify confidence level
    expect(result.result.confidence_level).toBe('low'); // Only 0.85 weight
    expect(result.result.confidence_score).toBeGreaterThan(0);

    // Verify matched criteria
    expect(result.result.matched_criteria).toContain('Technical Keywords');
  });

  it('should save classification result to database', async () => {
    const { documents } = await createTestData();
    const businessDoc = documents[0];

    const input: ClassifyDocumentInput = {
      document_id: businessDoc.id
    };

    const result = await classifyDocument(input);

    // Verify result was saved to database
    const savedResults = await db.select()
      .from(classificationResultsTable)
      .where(eq(classificationResultsTable.id, result.result.id))
      .execute();

    expect(savedResults).toHaveLength(1);
    const savedResult = savedResults[0];

    expect(savedResult.document_id).toBe(businessDoc.id);
    expect(savedResult.category_id).toBe(result.category.id);
    expect(savedResult.confidence_level).toBe(result.result.confidence_level);
    expect(parseFloat(savedResult.confidence_score)).toBe(result.result.confidence_score);
    expect(savedResult.classification_method).toBe('Pattern Matching');
    expect(savedResult.matched_criteria).toBe(JSON.stringify(result.result.matched_criteria));
  });

  it('should handle regex patterns correctly', async () => {
    const { categories } = await createTestData();

    // Create criteria with regex patterns
    await db.insert(criteriaTable)
      .values({
        category_id: categories[0].id,
        name: 'Regex Pattern',
        pattern: '\\b(test|demo|example)\\b',
        weight: '0.75'
      })
      .execute();

    // Create document with regex-matching content
    const documents = await db.insert(documentsTable)
      .values({
        filename: 'test_doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'This is a test document for demonstration purposes.'
      })
      .returning()
      .execute();

    const input: ClassifyDocumentInput = {
      document_id: documents[0].id
    };

    const result = await classifyDocument(input);

    expect(result.category.name).toBe('Business Documents');
    expect(result.result.matched_criteria).toContain('Regex Pattern');
  });

  it('should handle invalid regex patterns gracefully', async () => {
    const { categories } = await createTestData();

    // Create criteria with invalid regex pattern
    await db.insert(criteriaTable)
      .values({
        category_id: categories[0].id,
        name: 'Invalid Regex',
        pattern: '[unclosed bracket',
        weight: '0.50'
      })
      .execute();

    // Create document with simple text
    const documents = await db.insert(documentsTable)
      .values({
        filename: 'simple_doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'This document contains [unclosed bracket text for testing.'
      })
      .returning()
      .execute();

    const input: ClassifyDocumentInput = {
      document_id: documents[0].id
    };

    // Should not throw error and fall back to string matching
    const result = await classifyDocument(input);

    expect(result.category.name).toBe('Business Documents');
    expect(result.result.matched_criteria).toContain('Invalid Regex');
  });

  it('should throw error for non-existent document', async () => {
    await createTestData();

    const input: ClassifyDocumentInput = {
      document_id: 9999
    };

    await expect(classifyDocument(input)).rejects.toThrow(/document not found/i);
  });

  it('should throw error for document without content', async () => {
    const { documents } = await createTestData();
    const noContentDoc = documents[3];

    const input: ClassifyDocumentInput = {
      document_id: noContentDoc.id
    };

    await expect(classifyDocument(input)).rejects.toThrow(/no extractable content/i);
  });

  it('should throw error when no criteria are available', async () => {
    // Create document without any classification criteria
    const documents = await db.insert(documentsTable)
      .values({
        filename: 'orphan_doc.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'This document has no classification criteria available.'
      })
      .returning()
      .execute();

    const input: ClassifyDocumentInput = {
      document_id: documents[0].id
    };

    await expect(classifyDocument(input)).rejects.toThrow(/no classification criteria available/i);
  });

  it('should throw error when no matching criteria are found', async () => {
    const { categories } = await createTestData();

    // Create criteria that won't match
    await db.insert(criteriaTable)
      .values({
        category_id: categories[0].id,
        name: 'Unmatchable',
        pattern: 'xyzzyx123456',
        weight: '0.80'
      })
      .execute();

    // Create document that won't match any criteria
    const documents = await db.insert(documentsTable)
      .values({
        filename: 'no_match.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'This document contains no matching keywords or patterns.'
      })
      .returning()
      .execute();

    const input: ClassifyDocumentInput = {
      document_id: documents[0].id
    };

    await expect(classifyDocument(input)).rejects.toThrow(/no matching classification criteria found/i);
  });

  it('should properly calculate confidence scores and levels', async () => {
    const { categories } = await createTestData();

    // Create criteria with different weights to test confidence levels
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categories[0].id,
          name: 'High Weight 1',
          pattern: 'alpha',
          weight: '1.00'
        },
        {
          category_id: categories[0].id,
          name: 'High Weight 2',
          pattern: 'beta',
          weight: '1.00'
        },
        {
          category_id: categories[0].id,
          name: 'High Weight 3',
          pattern: 'gamma',
          weight: '1.00'
        }
      ])
      .execute();

    // Create document with high-scoring content
    const documents = await db.insert(documentsTable)
      .values({
        filename: 'high_score.pdf',
        file_type: 'pdf',
        file_size: 1024,
        content: 'This document contains alpha beta gamma keywords for maximum score.'
      })
      .returning()
      .execute();

    const input: ClassifyDocumentInput = {
      document_id: documents[0].id
    };

    const result = await classifyDocument(input);

    // Should achieve high confidence with total score >= 2.0
    expect(result.result.confidence_level).toBe('high');
    expect(result.result.confidence_score).toBeGreaterThan(0.6); // Normalized high score
    expect(result.result.matched_criteria.length).toBe(3);
  });
});