import { db } from '../db';
import { documentsTable, criteriaTable, categoriesTable, classificationResultsTable } from '../db/schema';
import { type ClassifyDocumentInput, type ClassificationResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const classifyDocument = async (input: ClassifyDocumentInput): Promise<ClassificationResponse> => {
  try {
    // 1. Fetch document content
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, input.document_id))
      .execute();

    if (documents.length === 0) {
      throw new Error('Document not found');
    }

    const document = documents[0];

    if (!document.content) {
      throw new Error('Document has no extractable content for classification');
    }

    // 2. Fetch all classification criteria with their categories
    const criteriaWithCategories = await db.select()
      .from(criteriaTable)
      .innerJoin(categoriesTable, eq(criteriaTable.category_id, categoriesTable.id))
      .execute();

    if (criteriaWithCategories.length === 0) {
      throw new Error('No classification criteria available');
    }

    // 3. Apply pattern matching and calculate scores
    const categoryScores: Record<number, {
      score: number;
      matchedCriteria: Array<{ id: number; name: string; pattern: string; weight: number; }>;
      category: typeof categoriesTable.$inferSelect;
    }> = {};

    const documentContent = document.content.toLowerCase();

    for (const criteriaRow of criteriaWithCategories) {
      const criteria = criteriaRow.criteria;
      const category = criteriaRow.categories;
      const weight = parseFloat(criteria.weight);

      // Initialize category score if not exists
      if (!categoryScores[category.id]) {
        categoryScores[category.id] = {
          score: 0,
          matchedCriteria: [],
          category: category
        };
      }

      // Test pattern matching
      let isMatch = false;
      try {
        // Try as regex first, fallback to simple string matching
        const regex = new RegExp(criteria.pattern, 'i');
        isMatch = regex.test(documentContent);
      } catch {
        // If regex is invalid, use simple string matching
        isMatch = documentContent.includes(criteria.pattern.toLowerCase());
      }

      if (isMatch) {
        categoryScores[category.id].score += weight;
        categoryScores[category.id].matchedCriteria.push({
          id: criteria.id,
          name: criteria.name,
          pattern: criteria.pattern,
          weight: weight
        });
      }
    }

    // 4. Determine best matching category
    let bestCategoryId: number | null = null;
    let bestScore = 0;

    for (const [categoryId, data] of Object.entries(categoryScores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestCategoryId = parseInt(categoryId);
      }
    }

    if (!bestCategoryId || bestScore === 0) {
      throw new Error('No matching classification criteria found for this document');
    }

    const bestCategory = categoryScores[bestCategoryId];

    // 5. Determine confidence level based on score
    let confidenceLevel: 'low' | 'medium' | 'high';
    if (bestScore >= 2.0) {
      confidenceLevel = 'high';
    } else if (bestScore >= 1.0) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }

    // Normalize confidence score to 0-1 range (cap at 1.0)
    const normalizedScore = Math.min(bestScore / 3.0, 1.0);

    // 6. Store classification result
    const classificationResults = await db.insert(classificationResultsTable)
      .values({
        document_id: input.document_id,
        category_id: bestCategoryId,
        confidence_level: confidenceLevel,
        confidence_score: normalizedScore.toString(),
        classification_method: 'Pattern Matching',
        matched_criteria: JSON.stringify(bestCategory.matchedCriteria.map(c => c.name))
      })
      .returning()
      .execute();

    const classificationResult = classificationResults[0];

    // 7. Fetch full criteria details for matched criteria
    const matchedCriteriaIds = bestCategory.matchedCriteria.map(c => c.id);
    const matchedCriteriaDetails = await db.select()
      .from(criteriaTable)
      .where(eq(criteriaTable.category_id, bestCategoryId))
      .execute();

    const filteredCriteriaDetails = matchedCriteriaDetails
      .filter(criteria => matchedCriteriaIds.includes(criteria.id))
      .map(criteria => ({
        ...criteria,
        weight: parseFloat(criteria.weight)
      }));

    // 8. Return structured response
    return {
      document: {
        ...document,
        uploaded_at: document.uploaded_at
      },
      result: {
        ...classificationResult,
        confidence_score: parseFloat(classificationResult.confidence_score),
        matched_criteria: JSON.parse(classificationResult.matched_criteria),
        classified_at: classificationResult.classified_at
      },
      category: {
        ...bestCategory.category,
        created_at: bestCategory.category.created_at
      },
      matched_criteria_details: filteredCriteriaDetails
    };

  } catch (error) {
    console.error('Document classification failed:', error);
    throw error;
  }
};