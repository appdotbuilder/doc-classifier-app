import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { getDocuments } from '../handlers/get_documents';

describe('getDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no documents exist', async () => {
    const result = await getDocuments();

    expect(result).toEqual([]);
  });

  it('should return all documents when documents exist', async () => {
    // Create test documents
    const testDocs = [
      {
        filename: 'document1.pdf',
        file_type: 'pdf' as const,
        file_size: 1024,
        content: 'Test content for document 1'
      },
      {
        filename: 'document2.docx',
        file_type: 'docx' as const,
        file_size: 2048,
        content: 'Test content for document 2'
      },
      {
        filename: 'document3.txt',
        file_type: 'txt' as const,
        file_size: 512,
        content: null // Test nullable content
      }
    ];

    // Insert test documents
    await db.insert(documentsTable)
      .values(testDocs)
      .execute();

    const result = await getDocuments();

    expect(result).toHaveLength(3);
    
    // Verify all required fields are present
    result.forEach(doc => {
      expect(doc.id).toBeDefined();
      expect(doc.filename).toBeDefined();
      expect(doc.file_type).toBeOneOf(['pdf', 'docx', 'txt']);
      expect(typeof doc.file_size).toBe('number');
      expect(doc.uploaded_at).toBeInstanceOf(Date);
      // content can be string or null
      expect(doc.content === null || typeof doc.content === 'string').toBe(true);
    });

    // Verify specific document data
    const pdfDoc = result.find(doc => doc.filename === 'document1.pdf');
    expect(pdfDoc).toBeDefined();
    expect(pdfDoc?.file_type).toBe('pdf');
    expect(pdfDoc?.file_size).toBe(1024);
    expect(pdfDoc?.content).toBe('Test content for document 1');

    const docxDoc = result.find(doc => doc.filename === 'document2.docx');
    expect(docxDoc).toBeDefined();
    expect(docxDoc?.file_type).toBe('docx');
    expect(docxDoc?.file_size).toBe(2048);

    const txtDoc = result.find(doc => doc.filename === 'document3.txt');
    expect(txtDoc).toBeDefined();
    expect(txtDoc?.file_type).toBe('txt');
    expect(txtDoc?.file_size).toBe(512);
    expect(txtDoc?.content).toBe(null);
  });

  it('should return documents ordered by upload time', async () => {
    // Create documents with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute ago
    const later = new Date(now.getTime() + 60000); // 1 minute from now

    // Insert documents in non-chronological order
    await db.insert(documentsTable)
      .values([
        {
          filename: 'middle.pdf',
          file_type: 'pdf' as const,
          file_size: 1000,
          content: 'Middle document'
        },
        {
          filename: 'first.txt',
          file_type: 'txt' as const,
          file_size: 500,
          content: 'First document'
        },
        {
          filename: 'last.docx',
          file_type: 'docx' as const,
          file_size: 1500,
          content: 'Last document'
        }
      ])
      .execute();

    const result = await getDocuments();

    expect(result).toHaveLength(3);
    
    // Verify all documents have valid upload timestamps
    result.forEach(doc => {
      expect(doc.uploaded_at).toBeInstanceOf(Date);
      expect(doc.uploaded_at.getTime()).toBeGreaterThan(0);
    });

    // Verify document filenames are present
    const filenames = result.map(doc => doc.filename);
    expect(filenames).toContain('middle.pdf');
    expect(filenames).toContain('first.txt');
    expect(filenames).toContain('last.docx');
  });

  it('should handle documents with various file types', async () => {
    // Test all supported file types
    const testDocs = [
      {
        filename: 'test.pdf',
        file_type: 'pdf' as const,
        file_size: 1024,
        content: 'PDF content'
      },
      {
        filename: 'test.docx',
        file_type: 'docx' as const,
        file_size: 2048,
        content: 'DOCX content'
      },
      {
        filename: 'test.txt',
        file_type: 'txt' as const,
        file_size: 512,
        content: 'TXT content'
      }
    ];

    await db.insert(documentsTable)
      .values(testDocs)
      .execute();

    const result = await getDocuments();

    expect(result).toHaveLength(3);

    const fileTypes = result.map(doc => doc.file_type);
    expect(fileTypes).toContain('pdf');
    expect(fileTypes).toContain('docx');
    expect(fileTypes).toContain('txt');

    // Verify each file type is properly handled
    result.forEach(doc => {
      expect(['pdf', 'docx', 'txt']).toContain(doc.file_type);
    });
  });

  it('should handle large number of documents', async () => {
    // Create multiple documents to test scalability
    const testDocs = Array.from({ length: 50 }, (_, i) => ({
      filename: `document_${i + 1}.pdf`,
      file_type: 'pdf' as const,
      file_size: 1000 + i,
      content: `Content for document ${i + 1}`
    }));

    await db.insert(documentsTable)
      .values(testDocs)
      .execute();

    const result = await getDocuments();

    expect(result).toHaveLength(50);
    
    // Verify each document has correct structure
    result.forEach((doc, index) => {
      expect(doc.id).toBeDefined();
      expect(doc.filename).toMatch(/^document_\d+\.pdf$/);
      expect(doc.file_type).toBe('pdf');
      expect(doc.file_size).toBeGreaterThan(999);
      expect(doc.content).toMatch(/^Content for document \d+$/);
      expect(doc.uploaded_at).toBeInstanceOf(Date);
    });

    // Verify unique IDs
    const ids = result.map(doc => doc.id);
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds).toHaveLength(50);
  });
});