import { Category } from '../types';

export function getChildCategoryIds(categoryId: string, categories: Category[]): string[] {
  const result: string[] = [];
  const directChildren = categories.filter(c => c.parent_id === categoryId);
  for (const child of directChildren) {
    result.push(child.id);
    result.push(...getChildCategoryIds(child.id, categories));
  }
  return result;
}

export function getCategoryPath(categoryIdOrName: string, categories: Category[]): Category[] {
  if (!categoryIdOrName || !categories.length) return [];
  const current = categories.find(c => c.id === categoryIdOrName || c.name === categoryIdOrName);
  if (!current) return [];
  if (current.parent_id) {
    const parentPath = getCategoryPath(current.parent_id, categories);
    return [...parentPath, current];
  }
  return [current];
}

export function getCategoryPathString(categoryIdOrName: string, categories: Category[]): string {
  const path = getCategoryPath(categoryIdOrName, categories);
  if (!path.length) return categoryIdOrName;
  return path.map(c => c.name).join(' > ');
}
