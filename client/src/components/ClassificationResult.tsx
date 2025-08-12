import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from './CategoryBadge';
import { FileText, CheckCircle, Target, Clock } from 'lucide-react';
import type { ClassificationResponse } from '../../../server/src/schema';

interface ClassificationResultProps {
  result: ClassificationResponse;
}

export function ClassificationResult({ result }: ClassificationResultProps) {
  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-400" />;
      case 'low': return <Clock className="h-4 w-4 text-red-400" />;
      default: return <Target className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConfidenceClass = (level: string) => {
    switch (level) {
      case 'high': return 'confidence-high';
      case 'medium': return 'confidence-medium';
      case 'low': return 'confidence-low';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <Card className="w-full bg-gray-800 border-gray-700 fade-in">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Classification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Information */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Document</h3>
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-white font-medium">{result.document.filename}</p>
            <p className="text-gray-400 text-sm">
              {result.document.file_type.toUpperCase()} • {(result.document.file_size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        {/* Classification Category */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Category</h3>
          <CategoryBadge category={result.category} className="text-sm" />
          {result.category.description && (
            <p className="text-gray-400 text-sm mt-2">{result.category.description}</p>
          )}
        </div>

        {/* Confidence Level */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Confidence</h3>
          <div className="flex items-center gap-2">
            <Badge className={`confidence-badge ${getConfidenceClass(result.result.confidence_level)}`}>
              {getConfidenceIcon(result.result.confidence_level)}
              <span className="ml-1 capitalize">{result.result.confidence_level}</span>
            </Badge>
            <span className="text-gray-400 text-sm">
              {(result.result.confidence_score * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Classification Method */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Method</h3>
          <Badge variant="outline" className="border-gray-600 text-gray-300">
            {result.result.classification_method}
          </Badge>
        </div>

        {/* Matched Criteria */}
        {result.matched_criteria_details.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Matched Criteria</h3>
            <div className="space-y-2">
              {result.matched_criteria_details.map((criteria) => (
                <div key={criteria.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{criteria.name}</span>
                    <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                      Weight: {(criteria.weight * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm mt-1 font-mono">
                    {criteria.pattern}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="pt-2 border-t border-gray-700">
          <p className="text-gray-500 text-xs">
            Classified on {result.result.classified_at.toLocaleDateString()} at{' '}
            {result.result.classified_at.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}