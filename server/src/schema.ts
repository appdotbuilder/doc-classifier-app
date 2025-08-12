import { z } from 'zod';

// Classification category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(), // Hex color code for badge
  description: z.string().nullable(),
  created_at: z.coerce.date(),
});

export type Category = z.infer<typeof categorySchema>;

// Criteria schema for classification rules
export const criteriaSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  name: z.string(),
  pattern: z.string(), // Regex pattern or keyword
  weight: z.number(), // Weight for scoring
  created_at: z.coerce.date(),
});

export type Criteria = z.infer<typeof criteriaSchema>;

// Document upload schema
export const documentSchema = z.object({
  id: z.number(),
  filename: z.string(),
  file_type: z.enum(['pdf', 'docx', 'txt']),
  file_size: z.number(),
  content: z.string().nullable(), // Extracted text content
  uploaded_at: z.coerce.date(),
});

export type Document = z.infer<typeof documentSchema>;

// Classification result schema
export const classificationResultSchema = z.object({
  id: z.number(),
  document_id: z.number(),
  category_id: z.number(),
  confidence_level: z.enum(['low', 'medium', 'high']),
  confidence_score: z.number(), // 0-1 score
  classification_method: z.string(),
  matched_criteria: z.array(z.string()), // Array of matched criteria names
  classified_at: z.coerce.date(),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

// Input schemas for creating entities
export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i), // Validate hex color
  description: z.string().nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createCriteriaInputSchema = z.object({
  category_id: z.number(),
  name: z.string().min(1),
  pattern: z.string().min(1),
  weight: z.number().min(0).max(1),
});

export type CreateCriteriaInput = z.infer<typeof createCriteriaInputSchema>;

// File upload input schema
export const uploadDocumentInputSchema = z.object({
  filename: z.string().min(1),
  file_type: z.enum(['pdf', 'docx', 'txt']),
  file_size: z.number().positive(),
  content: z.string().optional(), // For direct text content
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Classification request schema
export const classifyDocumentInputSchema = z.object({
  document_id: z.number(),
});

export type ClassifyDocumentInput = z.infer<typeof classifyDocumentInputSchema>;

// Update schemas for entities
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().nullable().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const updateCriteriaInputSchema = z.object({
  id: z.number(),
  category_id: z.number().optional(),
  name: z.string().min(1).optional(),
  pattern: z.string().min(1).optional(),
  weight: z.number().min(0).max(1).optional(),
});

export type UpdateCriteriaInput = z.infer<typeof updateCriteriaInputSchema>;

// Response schemas for API endpoints
export const classificationResponseSchema = z.object({
  document: documentSchema,
  result: classificationResultSchema,
  category: categorySchema,
  matched_criteria_details: z.array(criteriaSchema),
});

export type ClassificationResponse = z.infer<typeof classificationResponseSchema>;

export const categoriesListResponseSchema = z.object({
  categories: z.array(categorySchema),
});

export type CategoriesListResponse = z.infer<typeof categoriesListResponseSchema>;

export const criteriaListResponseSchema = z.object({
  criteria: z.array(z.object({
    id: z.number(),
    category_id: z.number(),
    category_name: z.string(),
    category_color: z.string(),
    name: z.string(),
    pattern: z.string(),
    weight: z.number(),
    created_at: z.coerce.date(),
  })),
});

export type CriteriaListResponse = z.infer<typeof criteriaListResponseSchema>;