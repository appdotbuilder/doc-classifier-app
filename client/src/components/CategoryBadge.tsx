import { Badge } from '@/components/ui/badge';
import type { Category } from '../../../server/src/schema';

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <Badge
      className={`text-white font-medium ${className}`}
      style={{ backgroundColor: category.color }}
    >
      {category.name}
    </Badge>
  );
}