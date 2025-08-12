import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBadge } from './CategoryBadge';
import { Tags } from 'lucide-react';
import type { Category } from '../../../server/src/schema';

interface CategoriesDisplayProps {
  categories: Category[];
  isLoading?: boolean;
}

export function CategoriesDisplay({ categories, isLoading = false }: CategoriesDisplayProps) {
  if (isLoading) {
    return (
      <Card className="w-full bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Available Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-700 rounded animate-pulse w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Available Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-gray-400 text-sm">No categories configured yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category: Category) => (
              <CategoryBadge key={category.id} category={category} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}