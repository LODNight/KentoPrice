import { useState, useEffect, useCallback } from 'react';
import type { Category, CategoryType } from '../types';
import { categoryRepository } from '../services';
import { validateCategory, validateCategoryUniqueness } from '../domain/validation';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryRepository.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(
    async (data: {
      name: string;
      type: CategoryType;
      icon: string;
      color: string;
    }): Promise<Category> => {
      const trimmedName = data.name.trim();
      const newCategory: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        type: data.type,
        icon: data.icon,
        color: data.color,
        isDefault: false,
        isArchived: false,
        order: categories.length + 1,
        createdAt: new Date().toISOString(),
      };

      validateCategory(newCategory);
      validateCategoryUniqueness(newCategory, categories);

      await categoryRepository.create(newCategory);
      await loadCategories();
      return newCategory;
    },
    [categories, loadCategories]
  );

  const updateCategory = useCallback(
    async (category: Category): Promise<void> => {
      validateCategory(category);
      validateCategoryUniqueness(category, categories);

      await categoryRepository.update(category);
      await loadCategories();
    },
    [categories, loadCategories]
  );

  const archiveCategory = useCallback(
    async (id: string): Promise<void> => {
      await categoryRepository.archive(id);
      await loadCategories();
    },
    [loadCategories]
  );

  const restoreCategory = useCallback(
    async (id: string): Promise<void> => {
      const target = categories.find((c) => c.id === id);
      if (target) {
        // Validate that restoring will not conflict with active category name
        validateCategoryUniqueness({ ...target, isArchived: false }, categories);
      }
      await categoryRepository.restore(id);
      await loadCategories();
    },
    [categories, loadCategories]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      await categoryRepository.delete(id);
      await loadCategories();
    },
    [loadCategories]
  );

  const getCategoryUsage = useCallback(
    async (id: string): Promise<number> => {
      return await categoryRepository.countReferencingTransactions(id);
    },
    []
  );

  return {
    categories,
    loading,
    error,
    reloadCategories: loadCategories,
    createCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
    deleteCategory,
    getCategoryUsage,
  };
}
