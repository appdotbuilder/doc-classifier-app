import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UploadDocumentInput } from '../schema';
import { uploadDocument } from '../handlers/upload_document';
import { eq } from 'drizzle-orm';

// Test input for PDF document
const testPdfInput: UploadDocumentInput = {
  filename: 'test-document.pdf',
  file_type: 'pdf',
  file_size: 2048576, // 2MB
  content: 'This is extracted text content from a PDF document.'
};

// Test input for DOCX document
const testDocxInput: UploadDocumentInput = {
  filename: 'report.docx',
  file_type: 'docx',
  file_size: 1024000, // 1MB
  content: 'Word document content extracted successfully.'
};

// Test input for TXT document
const testTxtInput: UploadDocumentInput = {
  filename: 'notes.txt',
  file_type: 'txt',
  file_size: 5120, // 5KB
  content: 'Plain text file content.'
};

// Test input without content
const testInputNoContent: UploadDocumentInput = {
  filename: 'empty-file.pdf',
  file_type: 'pdf',
  file_size: 1024
};

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload a PDF document with content', async () => {
    const result = await uploadDocument(testPdfInput);

    // Verify basic field values
    expect(result.filename).toEqual('test-document.pdf');
    expect(result.file_type).toEqual('pdf');
    expect(result.file_size).toEqual(2048576);
    expect(result.content).toEqual('This is extracted text content from a PDF document.');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload a DOCX document with content', async () => {
    const result = await uploadDocument(testDocxInput);

    // Verify field values
    expect(result.filename).toEqual('report.docx');
    expect(result.file_type).toEqual('docx');
    expect(result.file_size).toEqual(1024000);
    expect(result.content).toEqual('Word document content extracted successfully.');
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload a TXT document with content', async () => {
    const result = await uploadDocument(testTxtInput);

    // Verify field values
    expect(result.filename).toEqual('notes.txt');
    expect(result.file_type).toEqual('txt');
    expect(result.file_size).toEqual(5120);
    expect(result.content).toEqual('Plain text file content.');
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload document without content (content is null)', async () => {
    const result = await uploadDocument(testInputNoContent);

    // Verify field values
    expect(result.filename).toEqual('empty-file.pdf');
    expect(result.file_type).toEqual('pdf');
    expect(result.file_size).toEqual(1024);
    expect(result.content).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save document to database correctly', async () => {
    const result = await uploadDocument(testPdfInput);

    // Query database to verify document was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    
    expect(document.filename).toEqual('test-document.pdf');
    expect(document.file_type).toEqual('pdf');
    expect(document.file_size).toEqual(2048576);
    expect(document.content).toEqual('This is extracted text content from a PDF document.');
    expect(document.uploaded_at).toBeInstanceOf(Date);
  });

  it('should handle multiple document uploads', async () => {
    // Upload multiple different documents
    const result1 = await uploadDocument(testPdfInput);
    const result2 = await uploadDocument(testDocxInput);
    const result3 = await uploadDocument(testTxtInput);

    // Verify all have unique IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result2.id).not.toEqual(result3.id);
    expect(result1.id).not.toEqual(result3.id);

    // Query database to verify all documents exist
    const allDocuments = await db.select()
      .from(documentsTable)
      .execute();

    expect(allDocuments).toHaveLength(3);
    
    // Verify each document exists in database
    const filenames = allDocuments.map(doc => doc.filename);
    expect(filenames).toContain('test-document.pdf');
    expect(filenames).toContain('report.docx');
    expect(filenames).toContain('notes.txt');
  });

  it('should preserve all file types correctly', async () => {
    // Upload one of each file type
    const pdfResult = await uploadDocument({
      filename: 'document.pdf',
      file_type: 'pdf',
      file_size: 1000,
      content: 'PDF content'
    });

    const docxResult = await uploadDocument({
      filename: 'document.docx',
      file_type: 'docx',
      file_size: 2000,
      content: 'DOCX content'
    });

    const txtResult = await uploadDocument({
      filename: 'document.txt',
      file_type: 'txt',
      file_size: 500,
      content: 'TXT content'
    });

    // Verify file types are preserved correctly
    expect(pdfResult.file_type).toEqual('pdf');
    expect(docxResult.file_type).toEqual('docx');
    expect(txtResult.file_type).toEqual('txt');

    // Verify in database as well
    const documents = await db.select()
      .from(documentsTable)
      .execute();

    const fileTypes = documents.map(doc => doc.file_type);
    expect(fileTypes).toContain('pdf');
    expect(fileTypes).toContain('docx');
    expect(fileTypes).toContain('txt');
  });

  it('should handle large file sizes correctly', async () => {
    const largeFileInput: UploadDocumentInput = {
      filename: 'large-document.pdf',
      file_type: 'pdf',
      file_size: 52428800, // 50MB
      content: 'Large file content'
    };

    const result = await uploadDocument(largeFileInput);

    expect(result.file_size).toEqual(52428800);
    expect(typeof result.file_size).toBe('number');

    // Verify in database
    const document = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(document[0].file_size).toEqual(52428800);
  });
});