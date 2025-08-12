import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, criteriaTable } from '../db/schema';
import { getCriteria } from '../handlers/get_criteria';

describe('getCriteria', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no criteria exist', async () => {
    const result = await getCriteria();

    expect(result.criteria).toHaveLength(0);
  });

  it('should return all criteria with category details', async () => {
    // Create test categories first
    const categoryResults = await db.insert(categoriesTable)
      .values([
        {
          name: 'Legal Documents',
          color: '#FF5733',
          description: 'Legal related documents',
        },
        {
          name: 'Technical Specs',
          color: '#33A1FF',
          description: 'Technical documentation',
        }
      ])
      .returning()
      .execute();

    const legalCategoryId = categoryResults[0].id;
    const techCategoryId = categoryResults[1].id;

    // Create test criteria
    await db.insert(criteriaTable)
      .values([
        {
          category_id: legalCategoryId,
          name: 'Contract Keywords',
          pattern: '\\b(contract|agreement|terms)\\b',
          weight: '0.85', // String for numeric column
        },
        {
          category_id: legalCategoryId,
          name: 'Legal Terms',
          pattern: '\\b(whereas|hereby|aforementioned)\\b',
          weight: '0.70',
        },
        {
          category_id: techCategoryId,
          name: 'API Documentation',
          pattern: '\\b(API|endpoint|REST|GraphQL)\\b',
          weight: '0.90',
        }
      ])
      .execute();

    const result = await getCriteria();

    expect(result.criteria).toHaveLength(3);

    // Verify structure and data types
    result.criteria.forEach(criterion => {
      expect(typeof criterion.id).toBe('number');
      expect(typeof criterion.category_id).toBe('number');
      expect(typeof criterion.category_name).toBe('string');
      expect(typeof criterion.category_color).toBe('string');
      expect(typeof criterion.name).toBe('string');
      expect(typeof criterion.pattern).toBe('string');
      expect(typeof criterion.weight).toBe('number'); // Should be converted from string
      expect(criterion.created_at).toBeInstanceOf(Date);
    });

    // Find specific criteria to verify content
    const contractCriterion = result.criteria.find(c => c.name === 'Contract Keywords');
    expect(contractCriterion).toBeDefined();
    expect(contractCriterion!.category_name).toBe('Legal Documents');
    expect(contractCriterion!.category_color).toBe('#FF5733');
    expect(contractCriterion!.pattern).toBe('\\b(contract|agreement|terms)\\b');
    expect(contractCriterion!.weight).toBe(0.85);

    const apiCriterion = result.criteria.find(c => c.name === 'API Documentation');
    expect(apiCriterion).toBeDefined();
    expect(apiCriterion!.category_name).toBe('Technical Specs');
    expect(apiCriterion!.category_color).toBe('#33A1FF');
    expect(apiCriterion!.weight).toBe(0.90);
  });

  it('should handle criteria from multiple categories correctly', async () => {
    // Create categories
    const categoryResults = await db.insert(categoriesTable)
      .values([
        {
          name: 'Category A',
          color: '#FF0000',
          description: 'First category',
        },
        {
          name: 'Category B', 
          color: '#00FF00',
          description: 'Second category',
        }
      ])
      .returning()
      .execute();

    // Create criteria for both categories
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categoryResults[0].id,
          name: 'Criteria A1',
          pattern: 'pattern_a1',
          weight: '0.60',
        },
        {
          category_id: categoryResults[0].id,
          name: 'Criteria A2',
          pattern: 'pattern_a2', 
          weight: '0.70',
        },
        {
          category_id: categoryResults[1].id,
          name: 'Criteria B1',
          pattern: 'pattern_b1',
          weight: '0.80',
        }
      ])
      .execute();

    const result = await getCriteria();

    expect(result.criteria).toHaveLength(3);

    // Verify category A criteria
    const categoryACriteria = result.criteria.filter(c => c.category_name === 'Category A');
    expect(categoryACriteria).toHaveLength(2);
    categoryACriteria.forEach(criterion => {
      expect(criterion.category_color).toBe('#FF0000');
    });

    // Verify category B criteria
    const categoryBCriteria = result.criteria.filter(c => c.category_name === 'Category B');
    expect(categoryBCriteria).toHaveLength(1);
    expect(categoryBCriteria[0].category_color).toBe('#00FF00');
    expect(categoryBCriteria[0].name).toBe('Criteria B1');
    expect(categoryBCriteria[0].weight).toBe(0.80);
  });

  it('should properly convert weight numeric values', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#123456',
        description: 'Test category',
      })
      .returning()
      .execute();

    // Create criteria with various weight values
    await db.insert(criteriaTable)
      .values([
        {
          category_id: categoryResult[0].id,
          name: 'Zero Weight',
          pattern: 'test',
          weight: '0.00',
        },
        {
          category_id: categoryResult[0].id,
          name: 'Max Weight',
          pattern: 'test',
          weight: '1.00',
        },
        {
          category_id: categoryResult[0].id,
          name: 'Decimal Weight',
          pattern: 'test',
          weight: '0.33',
        }
      ])
      .execute();

    const result = await getCriteria();

    expect(result.criteria).toHaveLength(3);

    const zeroWeight = result.criteria.find(c => c.name === 'Zero Weight');
    expect(zeroWeight!.weight).toBe(0.00);
    expect(typeof zeroWeight!.weight).toBe('number');

    const maxWeight = result.criteria.find(c => c.name === 'Max Weight');
    expect(maxWeight!.weight).toBe(1.00);
    expect(typeof maxWeight!.weight).toBe('number');

    const decimalWeight = result.criteria.find(c => c.name === 'Decimal Weight');
    expect(decimalWeight!.weight).toBe(0.33);
    expect(typeof decimalWeight!.weight).toBe('number');
  });
});