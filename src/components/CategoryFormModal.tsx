import React, { useState, useEffect } from 'react';
import type { Category, CategoryType } from '../types';
import { IconRenderer } from './IconRenderer';
import { X, Check, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const CATEGORY_AVAILABLE_ICONS = [
  'utensils',
  'coffee',
  'shoppingbag',
  'shoppingcart',
  'car',
  'bus',
  'fuel',
  'home',
  'zap',
  'wifi',
  'film',
  'music',
  'smartphone',
  'laptop',
  'tv',
  'book',
  'graduationcap',
  'heart',
  'stethoscope',
  'pill',
  'dumbbell',
  'pawprint',
  'baby',
  'shirt',
  'gift',
  'package',
  'wrench',
  'briefcase',
  'banknote',
  'wallet',
  'creditcard',
  'coins',
  'piggybank',
  'award',
  'sparkles',
  'trendingup',
  'plane',
  'smile',
];

export const CATEGORY_AVAILABLE_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#64748B', // Slate
];

interface CategoryFormModalProps {
  isOpen: boolean;
  category?: Category | null;
  initialType?: CategoryType;
  existingCategories: Category[];
  isTypeLocked?: boolean;
  onSave: (data: {
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  category,
  initialType = 'expense',
  existingCategories,
  isTypeLocked = false,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(initialType);
  const [icon, setIcon] = useState('utensils');
  const [color, setColor] = useState('#F59E0B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (category) {
      setName(category.name);
      setType(category.type);
      setIcon(category.icon || (category.type === 'expense' ? 'utensils' : 'banknote'));
      setColor(category.color || (category.type === 'expense' ? '#F59E0B' : '#10B981'));
    } else {
      setName('');
      setType(initialType);
      setIcon(initialType === 'expense' ? 'shoppingbag' : 'banknote');
      setColor(initialType === 'expense' ? '#3B82F6' : '#10B981');
    }
    setNameError(null);
  }, [isOpen, category, initialType]);

  const validateName = (inputName: string, selectedType: CategoryType): boolean => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      setNameError('Tên danh mục không được để trống');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Tên danh mục không được vượt quá 50 ký tự');
      return false;
    }

    const normalized = trimmed.toLowerCase();
    const isDuplicate = existingCategories.some(
      (c) =>
        c.id !== category?.id &&
        c.type === selectedType &&
        !c.isArchived &&
        c.name.trim().toLowerCase() === normalized
    );

    if (isDuplicate) {
      setNameError(
        `Tên danh mục đã tồn tại trong nhóm ${selectedType === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}`
      );
      return false;
    }

    setNameError(null);
    return true;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name, type)) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        icon,
        color,
      });
      onClose();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Lỗi khi lưu danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div className="sheet-header" style={{ padding: '12px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: `${color}20`,
                color: color,
                border: `1.5px solid ${color}45`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 2px 8px ${color}25`,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <IconRenderer name={icon} size={22} />
            </div>
            <div>
              <h2 id="category-modal-title" className="sheet-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                {category ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {type === 'expense' ? 'Danh mục cho Khoản Chi' : 'Danh mục cho Khoản Thu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-sheet"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            className="sheet-body"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* 1. Type Toggle (Chi / Thu) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Loại danh mục
              </label>
              <div className="type-segmented-control" style={{ opacity: isTypeLocked ? 0.6 : 1 }}>
                <button
                  type="button"
                  className={`segmented-btn ${type === 'expense' ? 'active expense' : ''}`}
                  onClick={() => {
                    if (isTypeLocked) return;
                    setType('expense');
                    if (nameError) validateName(name, 'expense');
                  }}
                  disabled={isTypeLocked}
                >
                  <ArrowDownLeft size={16} />
                  Khoản Chi
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${type === 'income' ? 'active income' : ''}`}
                  onClick={() => {
                    if (isTypeLocked) return;
                    setType('income');
                    if (nameError) validateName(name, 'income');
                  }}
                  disabled={isTypeLocked}
                >
                  <ArrowUpRight size={16} />
                  Khoản Thu
                </button>
              </div>
              {isTypeLocked && (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  ℹ️ Đã có giao dịch liên kết với danh mục này nên không thể đổi loại Chi/Thu.
                </p>
              )}
            </div>

            {/* 2. Tên danh mục */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Tên danh mục <span style={{ color: 'var(--color-expense)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {name.trim().length}/50
                </span>
              </div>
              <input
                type="text"
                className="text-input"
                value={name}
                placeholder="ví dụ: Con cái, Thú cưng, Du lịch, Tiền thưởng..."
                maxLength={50}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) validateName(e.target.value, type);
                }}
                onBlur={() => validateName(name, type)}
                style={{
                  borderColor: nameError ? 'var(--color-expense)' : undefined,
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '0.875rem',
                }}
                autoFocus={!category}
              />
              {nameError && (
                <div style={{ color: 'var(--color-expense)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} />
                  <span>{nameError}</span>
                </div>
              )}
            </div>

            {/* 3. Chọn biểu tượng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Biểu tượng nhận diện
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {CATEGORY_AVAILABLE_ICONS.map((ic) => {
                  const isSelected = icon.toLowerCase() === ic;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      style={{
                        height: '36px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${color}` : '1px solid var(--color-border-subtle)',
                        backgroundColor: isSelected ? `${color}25` : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? color : 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        transform: isSelected ? 'scale(1.04)' : 'none',
                      }}
                      title={ic}
                    >
                      <IconRenderer name={ic} size={18} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Chọn màu sắc */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Màu sắc hiển thị
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CATEGORY_AVAILABLE_COLORS.map((c) => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: isSelected ? '2.5px solid #FFFFFF' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? `0 0 8px ${c}` : undefined,
                        transform: isSelected ? 'scale(1.12)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={c}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
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
              gap: '10px',
              backgroundColor: 'var(--color-surface-card)',
              flexShrink: 0,
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !!nameError}
            >
              {isSubmitting ? 'Đang lưu...' : category ? 'Lưu thay đổi' : 'Tạo Danh Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
