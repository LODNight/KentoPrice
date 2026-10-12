export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class CategoryTypeMismatchError extends DomainError {
  constructor(transactionType: string, categoryType: string) {
    super(
      `Giao dịch loại "${transactionType === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}" không thể gắn với danh mục loại "${categoryType === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}".`
    );
    this.name = 'CategoryTypeMismatchError';
  }
}

export class StorageUnavailableError extends Error {
  constructor(message = 'Trình duyệt không hỗ trợ hoặc đang chặn cơ sở dữ liệu IndexedDB.') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}
