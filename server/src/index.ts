import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types for validation
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createCriteriaInputSchema,
  updateCriteriaInputSchema,
  uploadDocumentInputSchema,
  classifyDocumentInputSchema,
} from './schema';

// Import handler functions
import { getCategories } from './handlers/get_categories';
import { createCategory } from './handlers/create_category';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { getCriteria } from './handlers/get_criteria';
import { createCriteria } from './handlers/create_criteria';
import { updateCriteria } from './handlers/update_criteria';
import { deleteCriteria } from './handlers/delete_criteria';
import { uploadDocument } from './handlers/upload_document';
import { classifyDocument } from './handlers/classify_document';
import { getDocuments } from './handlers/get_documents';
import { getClassificationResults } from './handlers/get_classification_results';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Category management endpoints
  getCategories: publicProcedure
    .query(() => getCategories()),

  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCategory(input.id)),

  // Criteria management endpoints
  getCriteria: publicProcedure
    .query(() => getCriteria()),

  createCriteria: publicProcedure
    .input(createCriteriaInputSchema)
    .mutation(({ input }) => createCriteria(input)),

  updateCriteria: publicProcedure
    .input(updateCriteriaInputSchema)
    .mutation(({ input }) => updateCriteria(input)),

  deleteCriteria: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCriteria(input.id)),

  // Document processing endpoints
  uploadDocument: publicProcedure
    .input(uploadDocumentInputSchema)
    .mutation(({ input }) => uploadDocument(input)),

  classifyDocument: publicProcedure
    .input(classifyDocumentInputSchema)
    .mutation(({ input }) => classifyDocument(input)),

  getDocuments: publicProcedure
    .query(() => getDocuments()),

  // Classification results endpoint
  getClassificationResults: publicProcedure
    .query(() => getClassificationResults()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Document Classifier API endpoints:');
  console.log('- Categories: getCategories, createCategory, updateCategory, deleteCategory');
  console.log('- Criteria: getCriteria, createCriteria, updateCriteria, deleteCriteria');
  console.log('- Documents: uploadDocument, classifyDocument, getDocuments');
  console.log('- Results: getClassificationResults');
}

start();