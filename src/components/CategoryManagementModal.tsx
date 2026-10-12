import React, { useState, useEffect, useMemo } from 'react';
import type { Category, CategoryType } from '../types';
import { IconRenderer } from './IconRenderer';
import { CategoryFormModal } from './CategoryFormModal';
import {
  X,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  EyeOff,
} from 'lucide-react';

interface CategoryManagementModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onCreateCategory: (data: {
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
  }) => Promise<Category>;
  onUpdateCategory: (category: Category) => Promise<void>;
  onArchiveCategory: (id: string) => Promise<void>;
  onRestoreCategory: (id: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  getCategoryUsage: (id: string) => Promise<number>;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  categories,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onArchiveCategory,
  onRestoreCategory,
  onDeleteCategory,
  getCategoryUsage,
}) => {
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // Load transaction usage counts for all categories
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsage = async () => {
      const counts: Record<string, number> = {};
      for (const cat of categories) {
        try {
          const count = await getCategoryUsage(cat.id);
          counts[cat.id] = count;
        } catch {
          counts[cat.id] = 0;
        }
      }
      if (isMounted) {
        setUsageCounts(counts);
      }
    };

    fetchUsage();
    return () => {
      isMounted = false;
    };
  }, [isOpen, categories, getCategoryUsage]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => c.type === activeType && !c.isArchived);
  }, [categories, activeType]);

  const archivedCategories = useMemo(() => {
    return categories.filter((c) => c.type === activeType && c.isArchived);
  }, [categories, activeType]);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleArchive = async (cat: Category) => {
    setActionError(null);
    if (window.confirm(`Bạn có chắc chắn muốn ẩn danh mục "${cat.name}"? Danh mục sẽ không xuất hiện khi thêm giao dịch mới.`)) {
      try {
        await onArchiveCategory(cat.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Lỗi khi ẩn danh mục');
      }
    }
  };

  const handleRestore = async (cat: Category) => {
    setActionError(null);
    try {
      await onRestoreCategory(cat.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi khi khôi phục danh mục');
    }
  };

  const handleDelete = async (cat: Category) => {
    setActionError(null);
    const count = usageCounts[cat.id] ?? 0;
    if (count > 0) {
      alert(`Không thể xóa danh mục "${cat.name}" vì có ${count} giao dịch đang liên kết. Bạn có thể chọn Ẩn danh mục.`);
      return;
    }

    if (window.confirm(`Xóa vĩnh viễn danh mục "${cat.name}"? Thao tác này không thể hoàn tác.`)) {
      try {
        await onDeleteCategory(cat.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Lỗi khi xóa danh mục');
      }
    }
  };

  const handleSaveCategory = async (data: {
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
  }) => {
    if (editingCategory) {
      await onUpdateCategory({
        ...editingCategory,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
      });
    } else {
      await onCreateCategory(data);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-sheet"
          style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-management-title"
        >
          <div className="sheet-handle" />

          {/* Modal Header */}
          <div className="sheet-header" style={{ padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={20} />
              </div>
              <div>
                <h2 id="category-management-title" className="sheet-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                  Quản Lý Danh Mục
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Tùy chỉnh danh mục theo thói quen cá nhân
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                style={{
                  padding: '7px 12px',
                  fontSize: '0.8125rem',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Plus size={15} />
                <span>Thêm Mới</span>
              </button>

              <button
                type="button"
                className="btn-close-sheet"
                onClick={onClose}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Action error banner */}
          {actionError && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-expense)',
                padding: '8px 16px',
                fontSize: '0.78125rem',
                borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              ⚠️ {actionError}
            </div>
          )}

          {/* Segmented Type Bar (100% width prevents text wrapping on mobile) */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--color-border-subtle)',
              flexShrink: 0,
            }}
          >
            <div className="type-segmented-control" style={{ width: '100%' }}>
              <button
                type="button"
                className={`segmented-btn ${activeType === 'expense' ? 'active expense' : ''}`}
                onClick={() => setActiveType('expense')}
                style={{ whiteSpace: 'nowrap', padding: '8px 12px' }}
              >
                <ArrowDownLeft size={15} style={{ flexShrink: 0 }} />
                <span>Khoản Chi</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500, marginLeft: '3px' }}>
                  ({categories.filter((c) => c.type === 'expense' && !c.isArchived).length})
                </span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${activeType === 'income' ? 'active income' : ''}`}
                onClick={() => setActiveType('income')}
                style={{ whiteSpace: 'nowrap', padding: '8px 12px' }}
              >
                <ArrowUpRight size={15} style={{ flexShrink: 0 }} />
                <span>Khoản Thu</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500, marginLeft: '3px' }}>
                  ({categories.filter((c) => c.type === 'income' && !c.isArchived).length})
                </span>
              </button>
            </div>
          </div>

          {/* Categories List Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Active Categories */}
            {activeCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Chưa có danh mục nào trong nhóm này. Bấm "+ Thêm Mới" để tạo danh mục.
              </div>
            ) : (
              activeCategories.map((cat) => {
                const count = usageCounts[cat.id] ?? 0;
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border-subtle)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconRenderer name={cat.icon} size={18} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                            {cat.name}
                          </span>
                          {cat.isDefault && (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {count > 0 ? `${count} giao dịch đã ghi` : 'Chưa có giao dịch'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleOpenEdit(cat)}
                        title="Chỉnh sửa danh mục"
                        aria-label="Chỉnh sửa danh mục"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleArchive(cat)}
                        title="Ẩn danh mục"
                        aria-label="Ẩn danh mục"
                      >
                        <EyeOff size={15} />
                      </button>

                      {!cat.isDefault && count === 0 && (
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: 'var(--color-expense)' }}
                          onClick={() => handleDelete(cat)}
                          title="Xóa vĩnh viễn"
                          aria-label="Xóa vĩnh viễn"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Archived Categories Section */}
            {archivedCategories.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--color-border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowArchived((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 0',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Archive size={14} />
                    <span>Danh mục đã ẩn ({archivedCategories.length})</span>
                  </span>
                  <span>{showArchived ? 'Thu gọn' : 'Xem chi tiết'}</span>
                </button>

                {showArchived && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {archivedCategories.map((cat) => (
                      <div
                        key={cat.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--color-border-subtle)',
                          opacity: 0.75,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              backgroundColor: `${cat.color}15`,
                              color: cat.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconRenderer name={cat.icon} size={16} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.845rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                              {cat.name}
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                              (Đã ẩn)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem', gap: '5px' }}
                          onClick={() => handleRestore(cat)}
                        >
                          <RotateCcw size={13} />
                          <span>Khôi phục</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="sheet-footer"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--color-surface-card)',
              flexShrink: 0,
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Category Form Modal for Create & Edit */}
      <CategoryFormModal
        isOpen={isFormOpen}
        category={editingCategory}
        initialType={activeType}
        existingCategories={categories}
        isTypeLocked={editingCategory ? (usageCounts[editingCategory.id] ?? 0) > 0 : false}
        onSave={handleSaveCategory}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
};
