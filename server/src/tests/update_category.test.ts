import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test category
  const createTestCategory = async () => {
    const result = await db.insert(categoriesTable)
      .values({
        name: 'Original Category',
        color: '#FF0000',
        description: 'Original description',
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update category name', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name',
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update category color', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      color: '#00FF00',
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#00FF00');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
  });

  it('should update category description', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: 'Updated description',
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
  });

  it('should update category description to null', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: null,
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Original Category'); // Should remain unchanged
    expect(result.color).toEqual('#FF0000'); // Should remain unchanged
    expect(result.description).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Multi-Updated Name',
      color: '#0000FF',
      description: 'Multi-updated description',
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Multi-Updated Name');
    expect(result.color).toEqual('#0000FF');
    expect(result.description).toEqual('Multi-updated description');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Database Test Update',
      color: '#FFFF00',
    };

    await updateCategory(updateInput);

    // Verify the update was persisted to the database
    const dbCategories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(dbCategories).toHaveLength(1);
    expect(dbCategories[0].name).toEqual('Database Test Update');
    expect(dbCategories[0].color).toEqual('#FFFF00');
    expect(dbCategories[0].description).toEqual('Original description'); // Should remain unchanged
  });

  it('should return unchanged category when no fields provided for update', async () => {
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Original Category');
    expect(result.color).toEqual('#FF0000');
    expect(result.description).toEqual('Original description');
    expect(result.created_at).toEqual(category.created_at);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'This should fail',
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 99999 not found/);
  });

  it('should handle category with null description', async () => {
    // Create category with null description
    const result = await db.insert(categoriesTable)
      .values({
        name: 'No Description Category',
        color: '#888888',
        description: null,
      })
      .returning()
      .execute();
    
    const category = result[0];

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Name Only',
    };

    const updatedCategory = await updateCategory(updateInput);

    expect(updatedCategory.id).toEqual(category.id);
    expect(updatedCategory.name).toEqual('Updated Name Only');
    expect(updatedCategory.color).toEqual('#888888');
    expect(updatedCategory.description).toBeNull(); // Should remain null
  });
});