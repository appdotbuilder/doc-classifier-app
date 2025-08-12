import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all categories with correct structure', async () => {
    // Create test categories
    const testCategories = [
      {
        name: 'Financial Documents',
        color: '#FF5733',
        description: 'Bank statements, invoices, receipts'
      },
      {
        name: 'Legal Documents',
        color: '#3366FF',
        description: 'Contracts, agreements, legal notices'
      },
      {
        name: 'Personal Documents',
        color: '#33FF66',
        description: null // Test nullable description
      }
    ];

    // Insert test data
    await db.insert(categoriesTable)
      .values(testCategories)
      .execute();

    const result = await getCategories();

    // Verify result structure and content
    expect(result).toHaveLength(3);
    expect(Array.isArray(result)).toBe(true);

    // Check each category has the correct structure
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(typeof category.id).toBe('number');
      expect(typeof category.name).toBe('string');
      expect(typeof category.color).toBe('string');
      expect(category.description === null || typeof category.description === 'string').toBe(true);
      expect(category.created_at).toBeInstanceOf(Date);
    });

    // Check specific category values
    const financialCategory = result.find(cat => cat.name === 'Financial Documents');
    expect(financialCategory).toBeDefined();
    expect(financialCategory!.color).toBe('#FF5733');
    expect(financialCategory!.description).toBe('Bank statements, invoices, receipts');

    const personalCategory = result.find(cat => cat.name === 'Personal Documents');
    expect(personalCategory).toBeDefined();
    expect(personalCategory!.description).toBe(null);
  });

  it('should return categories ordered by creation date', async () => {
    // Create categories with slight delay to ensure different timestamps
    await db.insert(categoriesTable)
      .values({
        name: 'First Category',
        color: '#FF0000',
        description: 'Created first'
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        color: '#00FF00',
        description: 'Created second'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    
    // Verify ordering by creation date (ascending order)
    expect(result[0].name).toBe('First Category');
    expect(result[1].name).toBe('Second Category');
    
    // Verify timestamps are in ascending order
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should handle categories with special characters and colors', async () => {
    const specialCategory = {
      name: 'Spécial Catégory & símböls!',
      color: '#ABCDEF',
      description: 'Contains special characters: @#$%^&*()'
    };

    await db.insert(categoriesTable)
      .values(specialCategory)
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Spécial Catégory & símböls!');
    expect(result[0].color).toBe('#ABCDEF');
    expect(result[0].description).toBe('Contains special characters: @#$%^&*()');
  });

  it('should handle large number of categories efficiently', async () => {
    // Create 100 test categories
    const manyCategories = Array.from({ length: 100 }, (_, i) => ({
      name: `Category ${i + 1}`,
      color: `#${(Math.floor(Math.random() * 16777215)).toString(16).padStart(6, '0').toUpperCase()}`,
      description: i % 3 === 0 ? null : `Description for category ${i + 1}`
    }));

    await db.insert(categoriesTable)
      .values(manyCategories)
      .execute();

    const start = Date.now();
    const result = await getCategories();
    const duration = Date.now() - start;

    expect(result).toHaveLength(100);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second

    // Verify all categories are returned with proper structure
    result.forEach((category, index) => {
      expect(category.name).toBe(`Category ${index + 1}`);
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(category.id).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
    });
  });

  it('should maintain data integrity after database operations', async () => {
    // Insert initial category
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#123456',
        description: 'Original description'
      })
      .execute();

    // Get initial result
    const initialResult = await getCategories();
    expect(initialResult).toHaveLength(1);

    // Update the category directly in database
    await db.update(categoriesTable)
      .set({ description: 'Updated description' })
      .execute();

    // Verify handler returns updated data
    const updatedResult = await getCategories();
    expect(updatedResult).toHaveLength(1);
    expect(updatedResult[0].description).toBe('Updated description');
    expect(updatedResult[0].name).toBe('Test Category');
    expect(updatedResult[0].color).toBe('#123456');
  });
});