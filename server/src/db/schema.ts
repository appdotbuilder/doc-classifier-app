import { serial, text, pgTable, timestamp, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for file types
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'txt']);

// Enum for confidence levels
export const confidenceLevelEnum = pgEnum('confidence_level', ['low', 'medium', 'high']);

// Categories table for classification categories
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(), // Hex color code for badge display
  description: text('description'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Criteria table for classification rules
export const criteriaTable = pgTable('criteria', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id').notNull(),
  name: text('name').notNull(),
  pattern: text('pattern').notNull(), // Regex pattern or keyword for matching
  weight: numeric('weight', { precision: 3, scale: 2 }).notNull(), // Weight for scoring (0.00-1.00)
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Documents table for uploaded files
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  file_type: fileTypeEnum('file_type').notNull(),
  file_size: integer('file_size').notNull(), // File size in bytes
  content: text('content'), // Extracted text content, nullable
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),
});

// Classification results table
export const classificationResultsTable = pgTable('classification_results', {
  id: serial('id').primaryKey(),
  document_id: integer('document_id').notNull(),
  category_id: integer('category_id').notNull(),
  confidence_level: confidenceLevelEnum('confidence_level').notNull(),
  confidence_score: numeric('confidence_score', { precision: 4, scale: 3 }).notNull(), // 0.000-1.000
  classification_method: text('classification_method').notNull(),
  matched_criteria: text('matched_criteria').notNull(), // JSON array of matched criteria names
  classified_at: timestamp('classified_at').defaultNow().notNull(),
});

// Define relations between tables
export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  criteria: many(criteriaTable),
  classificationResults: many(classificationResultsTable),
}));

export const criteriaRelations = relations(criteriaTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [criteriaTable.category_id],
    references: [categoriesTable.id],
  }),
}));

export const documentsRelations = relations(documentsTable, ({ many }) => ({
  classificationResults: many(classificationResultsTable),
}));

export const classificationResultsRelations = relations(classificationResultsTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [classificationResultsTable.document_id],
    references: [documentsTable.id],
  }),
  category: one(categoriesTable, {
    fields: [classificationResultsTable.category_id],
    references: [categoriesTable.id],
  }),
}));

// TypeScript types for table schemas
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Criteria = typeof criteriaTable.$inferSelect;
export type NewCriteria = typeof criteriaTable.$inferInsert;

export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

export type ClassificationResult = typeof classificationResultsTable.$inferSelect;
export type NewClassificationResult = typeof classificationResultsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  categories: categoriesTable,
  criteria: criteriaTable,
  documents: documentsTable,
  classificationResults: classificationResultsTable,
};

export const relations_export = {
  categoriesRelations,
  criteriaRelations,
  documentsRelations,
  classificationResultsRelations,
};