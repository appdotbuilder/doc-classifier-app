import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from './CategoryBadge';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CriteriaListResponse, Category } from '../../../server/src/schema';

export function CriteriaManagement() {
  const [criteria, setCriteria] = useState<CriteriaListResponse['criteria']>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [criteriaResponse, categoriesResponse] = await Promise.all([
        trpc.getCriteria.query(),
        trpc.getCategories.query()
      ]);
      setCriteria(criteriaResponse.criteria);
      setCategories(categoriesResponse);
    } catch (error) {
      console.error('Failed to load criteria data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCategoryById = (id: number): Category | undefined => {
    return categories.find((cat: Category) => cat.id === id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Criteria Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Classification Criteria
          </CardTitle>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Criteria
          </Button>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No classification criteria configured yet.</p>
              <p className="text-gray-500 text-sm">
                Add criteria to define how documents should be classified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {criteria.map((criterion) => {
                const category = getCategoryById(criterion.category_id);
                return (
                  <div key={criterion.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">{criterion.name}</h3>
                          {category && (
                            <CategoryBadge category={category} className="text-xs" />
                          )}
                        </div>
                        <p className="text-gray-300 font-mono text-sm bg-gray-800 rounded px-2 py-1">
                          {criterion.pattern}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                          Weight: {(criterion.weight * 100).toFixed(0)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-400 hover:bg-gray-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Created: {criterion.created_at.toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Management Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Categories
          </CardTitle>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No categories configured yet.</p>
              <p className="text-gray-500 text-sm">
                Add categories to organize your document classifications.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {categories.map((category: Category) => (
                <div key={category.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <CategoryBadge category={category} />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-gray-300 text-sm mb-2">{category.description}</p>
                  )}
                  <p className="text-gray-400 text-xs">
                    Created: {category.created_at.toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}