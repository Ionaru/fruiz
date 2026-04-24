export interface CategoryCollectionProgress {
  categoryName: string;
  collected: number;
  total: number;
}

export function formatCategoryProgressLine(
  progress: CategoryCollectionProgress,
): string {
  const remaining = progress.total - progress.collected;
  if (remaining <= 0) {
    return `All ${progress.total} collected in ${progress.categoryName}!`;
  }
  return `${remaining} left to collect in ${progress.categoryName}.`;
}
