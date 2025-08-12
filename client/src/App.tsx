import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from './components/FileUpload';
import { ClassificationResult } from './components/ClassificationResult';
import { CategoriesDisplay } from './components/CategoriesDisplay';
import { CriteriaManagement } from './components/CriteriaManagement';
import { trpc } from '@/utils/trpc';
import { FileText, Settings, Loader2 } from 'lucide-react';
import type { Category, ClassificationResponse } from '../../server/src/schema';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [classificationResult, setClassificationResult] = useState<ClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('classifier');

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid PDF, DOCX, or TXT file.';
    }
    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    setSelectedFile(file);
    setClassificationResult(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setClassificationResult(null);
    setError(null);
  };

  const getFileTypeFromFile = (file: File): 'pdf' | 'docx' | 'txt' => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (file.type === 'text/plain') return 'txt';
    
    // Fallback based on file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    return 'txt';
  };

  const handleClassifyDocument = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setIsClassifying(true);
    setError(null);

    try {
      // First upload the document
      const uploadResponse = await trpc.uploadDocument.mutate({
        filename: selectedFile.name,
        file_type: getFileTypeFromFile(selectedFile),
        file_size: selectedFile.size,
        content: selectedFile.type === 'text/plain' ? await selectedFile.text() : undefined,
      });

      // Then classify the uploaded document
      const classificationResponse = await trpc.classifyDocument.mutate({
        document_id: uploadResponse.id,
      });

      setClassificationResult(classificationResponse);
    } catch (error) {
      console.error('Classification failed:', error);
      setError('Classification failed. Please try again.');
    } finally {
      setIsUploading(false);
      setIsClassifying(false);
    }
  };

  const isClassifyDisabled = !selectedFile || isUploading || isClassifying;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-400" />
            Document Classifier
          </h1>
          <p className="text-gray-400">
            Upload and classify your documents using AI-powered pattern recognition
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger
              value="classifier"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Document Classifier
            </TabsTrigger>
            <TabsTrigger
              value="criteria"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Criteria Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classifier" className="space-y-6">
            {/* Categories Display */}
            <CategoriesDisplay categories={categories} isLoading={categoriesLoading} />

            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClearFile={handleClearFile}
              isUploading={isUploading}
              error={error}
            />

            {/* Classify Button */}
            {selectedFile && (
              <div className="text-center">
                <Button
                  onClick={handleClassifyDocument}
                  disabled={isClassifyDisabled}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-lg"
                >
                  {isClassifying ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Classifying...
                    </>
                  ) : (
                    'Classify Document'
                  )}
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && !isUploading && (
              <Alert className="bg-red-900 border-red-700">
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Classification Result */}
            {classificationResult && (
              <ClassificationResult result={classificationResult} />
            )}
          </TabsContent>

          <TabsContent value="criteria">
            <CriteriaManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;