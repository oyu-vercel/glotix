import { Category } from '../../vocabulary/vocabulary.types';

export function countWords(categories: Category[]): number {
  return categories.reduce((sum, c) => sum + c.words.length, 0);
}
