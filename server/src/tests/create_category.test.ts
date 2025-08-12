import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCategoryInput = {
  name: 'Test Category',
  color: '#FF5733',
  description: 'A category for testing purposes',
};

// Test input without optional description
const minimalInput: CreateCategoryInput = {
  name: 'Minimal Category',
  color: '#00FF00',
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const result = await createCategory(testInput);

    // Validate all fields
    expect(result.name).toEqual('Test Category');
    expect(result.color).toEqual('#FF5733');
    expect(result.description).toEqual('A category for testing purposes');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category without description', async () => {
    const result = await createCategory(minimalInput);

    // Validate required fields
    expect(result.name).toEqual('Minimal Category');
    expect(result.color).toEqual('#00FF00');
    expect(result.description).toBeNull(); // Should be null when not provided
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query database to verify insertion
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    const savedCategory = categories[0];
    expect(savedCategory.name).toEqual('Test Category');
    expect(savedCategory.color).toEqual('#FF5733');
    expect(savedCategory.description).toEqual('A category for testing purposes');
    expect(savedCategory.created_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const result = await createCategory(minimalInput);

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].description).toBeNull();
  });

  it('should create multiple categories with unique IDs', async () => {
    const result1 = await createCategory({
      name: 'Category 1',
      color: '#FF0000',
      description: 'First category',
    });

    const result2 = await createCategory({
      name: 'Category 2', 
      color: '#0000FF',
      description: 'Second category',
    });

    // Verify unique IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Category 1');
    expect(result2.name).toEqual('Category 2');

    // Verify both exist in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    
    const categoryNames = allCategories.map(c => c.name);
    expect(categoryNames).toContain('Category 1');
    expect(categoryNames).toContain('Category 2');
  });

  it('should handle valid hex color codes', async () => {
    const colorVariations = [
      { name: 'Red', color: '#FF0000' },
      { name: 'Green', color: '#00FF00' },
      { name: 'Blue', color: '#0000FF' },
      { name: 'White', color: '#FFFFFF' },
      { name: 'Black', color: '#000000' },
      { name: 'Mixed', color: '#A1B2C3' },
    ];

    for (const variation of colorVariations) {
      const result = await createCategory({
        name: variation.name,
        color: variation.color,
        description: `Test category with ${variation.color}`,
      });

      expect(result.color).toEqual(variation.color);
      expect(result.name).toEqual(variation.name);
    }

    // Verify all were saved
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(colorVariations.length);
  });

  it('should preserve timestamps correctly', async () => {
    const beforeCreation = new Date();
    
    const result = await createCategory(testInput);
    
    const afterCreation = new Date();

    // Verify timestamp is within reasonable range
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});