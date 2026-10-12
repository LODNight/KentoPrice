# Domain Data Model: Personal Expense Tracker (QL Thu Chi)

## 1. Domain Design Principles

1. **Four Core Persistent Entities**:
   Hệ thống quản lý dữ liệu bền vững bao gồm 4 thực thể gốc được lưu trữ trong cơ sở dữ liệu local (IndexedDB Schema Version 2):
   - `Transaction` (Giao dịch thu / chi)
   - `Category` (Mục / Danh mục phân loại thu chi)
   - `Fund` (Quỹ ngân sách chi tiêu mục đích)
   - `FundMonthlyConfig` (Cấu hình hạn mức và chế độ ngân sách độc lập theo từng tháng `YYYY-MM`)
2. **Zero Speculative Entities**:
   Các thực thể ngoài phạm vi MVP như tài khoản ngân hàng phức tạp, kết nối API ngân hàng, giao dịch định kỳ tự động, mục tiêu tiết kiệm đa cấp, ví đa tiền tệ đều bị loại bỏ để giữ ứng dụng gọn nhẹ, tức thì.
3. **Derived Values Are Strictly Non-Persisted**:
   Các số liệu dẫn xuất tài chính (Tổng thu `totalIncome`, Tổng chi `totalExpense`, Số dư ròng `netBalance`, Số dư đầu kỳ `openingBalance`, Số dư khả dụng của Quỹ `currentBalance`, Tỷ lệ chi tiêu `spendingPercentage`, Cờ cảnh báo bội chi `isOverBudget`) **tuyệt đối không được lưu trữ trong database**. Mọi số liệu dẫn xuất được tính toán on-demand bằng Pure Domain Functions để loại bỏ hoàn toàn rủi ro lệch dữ liệu (stale cache).
4. **Whole Integer Currency (VND)**:
   Mọi giá trị tiền tệ lưu trữ đều là số nguyên dương hoặc không âm (integer $\ge 0$), đơn vị Đồng Việt Nam (`VND`). Tuyệt đối không dùng số thực (float/decimal) hay chuỗi định dạng trong tầng lưu trữ.
5. **Separation of Calendar Dates vs Timestamps**:
   - `transactionDate`: Ngày dương lịch địa phương (`YYYY-MM-DD`) ghi nhận giao dịch theo giờ sinh hoạt của người dùng. Không chuyển đổi UTC hay lưu Unix epoch milliseconds, loại trừ hoàn toàn lỗi lệch ngày khi nhập lúc 23:00 đêm.
   - `yearMonth`: Chu kỳ tháng dương lịch (`YYYY-MM`) cho cấu hình ngân sách và báo cáo.
   - `createdAt` / `updatedAt`: Dấu thời gian kiểm toán hệ thống theo chuẩn ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 2. Core Persistent Entities

### 2.1 Entity: `Transaction` (Giao dịch)

Đại diện cho một sự kiện tài chính thu hoặc chi tiền thực tế của người dùng.

```ts
export type TransactionType = 'expense' | 'income';

export interface Transaction {
  /** Unique identifier (UUID v4 or 21-char nanoid with prefix 'txn_') */
  id: string;

  /** Financial direction: 'expense' (Khoản Chi) or 'income' (Khoản Thu) */
  type: TransactionType;

  /** 
   * Transaction amount in whole integer VND.
   * Invariant: Integer > 0 and <= 1,000,000,000,000 (1 nghìn tỷ VND).
   * Example: 35000 (representing 35.000 ₫)
   */
  amount: number;

  /** Foreign key reference to Category.id */
  categoryId: string;

  /** 
   * Calendar date when the transaction occurred in local time.
   * Format: 'YYYY-MM-DD' (Strict regex: ^\d{4}-\d{2}-\d{2}$)
   * Example: '2026-10-10'
   */
  transactionDate: string;

  /** Optional user description or note (trimmed, max 200 chars) */
  note?: string;

  /** 
   * Optional foreign key reference to Fund.id (0..1 relation, PDR-008).
   * - undefined / null: Giao dịch tự do ngoài ngân sách Quỹ.
   * - string: Giao dịch được bảo trợ/hạch toán vào Quỹ có ID tương ứng.
   * Invariant: Khi Quỹ bị ẩn (isArchived: true), fundId KHÔNG bị null hóa (PDR-020).
   */
  fundId?: string | null;

  /** System audit timestamp when record was created (ISO 8601 UTC) */
  createdAt: string;

  /** System audit timestamp when record was last updated (ISO 8601 UTC) */
  updatedAt: string;
}
```

#### Field Specifications & Invariants for `Transaction`

| Field | Type | Mandatory | Invariants / Validation Rules | Example |
|---|---|---|---|---|
| `id` | `string` | Yes | Chuỗi không rỗng, định dạng `txn_[a-zA-Z0-9_-]+`. Unique toàn hệ thống. | `"txn_9f8b2c41"` |
| `type` | `'expense' \| 'income'` | Yes | Bắt buộc là chữ thường `'expense'` hoặc `'income'`. | `'expense'` |
| `amount` | `number` | Yes | Số nguyên dương: `Number.isInteger(amount) && amount > 0 && amount <= 1e12`. | `35000` |
| `categoryId` | `string` | Yes | Chuỗi không rỗng tham chiếu `Category.id`. `Category.type` phải trùng với `Transaction.type`. | `"cat_coffee"` |
| `transactionDate` | `string` | Yes | Regex `^\d{4}-\d{2}-\d{2}$`. Phải là ngày dương lịch hợp lệ. | `"2026-10-10"` |
| `note` | `string` | No | Tùy chọn. Chuỗi đã trim, tối đa 200 ký tự. | `"Cà phê sáng vỉa hè"` |
| `fundId` | `string \| null` | No | Tùy chọn (0..1). Nếu có giá trị, phải tham chiếu đến một `Fund.id` hợp lệ. | `"fund_sho_92a"` |
| `createdAt` | `string` | Yes | Chuẩn ISO 8601 UTC `YYYY-MM-DDTHH:mm:ss.sssZ`. Bất biến sau khi tạo. | `"2026-10-10T02:30:00.000Z"` |
| `updatedAt` | `string` | Yes | Chuẩn ISO 8601 UTC. Cập nhật mỗi lần sửa. Invariant: `updatedAt >= createdAt`. | `"2026-10-10T02:30:00.000Z"` |

---

### 2.2 Entity: `Category` (Mục / Danh mục)

Đại diện cho nhãn phân loại bản chất khoản chi hoặc nguồn thu nhập (Ăn uống, Cà phê, Lương, Thưởng...).

```ts
export type CategoryType = 'expense' | 'income';

export interface Category {
  /** Unique category identifier (prefix 'cat_' or UUID) */
  id: string;

  /** 
   * Human-readable category name in Vietnamese.
   * Invariant: 1..50 chars, trimmed, unique per category type among active categories.
   */
  name: string;

  /** Classification: 'expense' (Chi) or 'income' (Thu) */
  type: CategoryType;

  /** Semantic icon key (Lucide icon identifier, e.g. 'Utensils', 'Coffee', 'Car') */
  icon: string;

  /** Semantic color token or hex string (e.g. '#F59E0B') */
  color: string;

  /** Flag indicating standard built-in system category (true) vs user-created (false) */
  isDefault: boolean;

  /** Soft-delete flag: if true, hidden from new transaction selection */
  isArchived: boolean;

  /** Display sort order (0-indexed integer >= 0) */
  order: number;

  /** System timestamp when category was created (ISO 8601 UTC) */
  createdAt: string;
}
```

#### Field Specifications & Invariants for `Category`

| Field | Type | Mandatory | Invariants / Validation Rules | Example |
|---|---|---|---|---|
| `id` | `string` | Yes | Chuỗi không rỗng, định dạng `cat_[a-zA-Z0-9_-]+`. Unique toàn hệ thống. | `"cat_food"` |
| `name` | `string` | Yes | Chuỗi đã trim, 1–50 ký tự. Không trùng tên trong cùng `type` (`isArchived: false`). | `"Ăn uống"` |
| `type` | `'expense' \| 'income'` | Yes | Bắt buộc là `'expense'` hoặc `'income'`. **Bất biến khi đã có giao dịch tham chiếu** (PDR-023). | `'expense'` |
| `icon` | `string` | Yes | Tên Lucide icon hợp lệ. | `"Utensils"` |
| `color` | `string` | Yes | Mã hex color CSS chuẩn (ví dụ `#F59E0B`). | `"#F59E0B"` |
| `isDefault` | `boolean` | Yes | `true` cho danh mục mặc định của hệ thống; `false` cho danh mục người dùng tạo. | `true` |
| `isArchived` | `boolean` | Yes | `false` (Đang hoạt động) hoặc `true` (Đã ẩn). | `false` |
| `order` | `number` | Yes | Số nguyên không âm $\ge 0$. Điều khiển thứ tự hiển thị danh mục. | `1` |
| `createdAt` | `string` | Yes | Chuẩn ISO 8601 UTC. | `"2026-09-01T00:00:00.000Z"` |

#### Danh mục Mặc định Hệ thống (System Seed Data)

| Category ID | Tên Danh mục | Loại (`type`) | Lucide Icon | Mã Màu |
|---|---|---|---|---|
| `cat_food` | Ăn uống | `expense` | `Utensils` | `#F59E0B` (Amber) |
| `cat_coffee` | Cà phê & Đồ uống | `expense` | `Coffee` | `#84CC16` (Lime) |
| `cat_transport` | Di chuyển & Xăng xe | `expense` | `Car` | `#3B82F6` (Blue) |
| `cat_shopping` | Mua sắm & Đồ dùng | `expense` | `ShoppingBag` | `#EC4899` (Pink) |
| `cat_bills` | Hóa đơn & Tiện ích | `expense` | `Receipt` | `#8B5CF6` (Purple) |
| `cat_entertainment` | Giải trí & Phim | `expense` | `Film` | `#06B6D4` (Cyan) |
| `cat_salary` | Tiền lương | `income` | `Banknote` | `#10B981` (Emerald) |
| `cat_bonus` | Thưởng & Thu nhập thêm | `income` | `Sparkles` | `#14B8A6` (Teal) |
| `cat_other_income` | Thu nhập khác | `income` | `ArrowDownLeft` | `#6366F1` (Indigo) |

---

### 2.3 Entity: `Fund` (Quỹ Ngân Sách)

Đại diện cho một Quỹ ngân sách mục đích chịu trách nhiệm chi trả (PDR-008, PDR-009, PDR-010, PDR-015).

```ts
export type BudgetMode = 'rollover' | 'reset';

export interface Fund {
  /** Unique fund identifier (prefix 'fund_' or UUID v4) */
  id: string;

  /**
   * Human-readable fund name in Vietnamese.
   * Invariant: 1..50 chars, trimmed, unique among active funds (case-insensitive, PDR-015).
   * Example: 'Quỹ Sinh Hoạt', 'Quỹ Đãi Tiệc'
   */
  name: string;

  /** Semantic SVG icon key (Lucide icon identifier, e.g. 'Wallet', 'Coffee', 'Car') */
  icon: string;

  /** Semantic color hex string (e.g. '#3B82F6', '#10B981') */
  color: string;

  /**
   * Soft-delete flag: if true, fund is hidden (PDR-009).
   * Hidden funds retain all historical transactions but cannot be picked for new entries.
   */
  isArchived: boolean;

  /** Display sort order (0-indexed integer >= 0) */
  order: number;

  /**
   * Baseline default monthly budget in whole integer VND (>= 0).
   * Invariant: Integer >= 0. Budget = 0 ₫ is allowed (PDR-011). Max: 1,000,000,000,000 VND.
   * Serves as default budget when a new month has no explicit monthly config.
   */
  defaultBudget: number;

  /**
   * Baseline default budget mode ('rollover' | 'reset').
   * Serves as default calculation mode when a new month has no explicit monthly config.
   */
  defaultMode: BudgetMode;

  /** System timestamp when fund was created (ISO 8601 UTC) */
  createdAt: string;

  /** System timestamp when fund was last updated (ISO 8601 UTC) */
  updatedAt: string;
}
```

#### Field Specifications & Invariants for `Fund`

| Field | Type | Mandatory | Invariants / Validation Rules | Example |
|---|---|---|---|---|
| `id` | `string` | Yes | Chuỗi không rỗng, định dạng `fund_[a-zA-Z0-9_-]+`. Unique toàn hệ thống. | `"fund_life_01"` |
| `name` | `string` | Yes | 1–50 ký tự đã trim. Không trùng tên trong danh sách Quỹ Active (so sánh `trim().toLowerCase()`). | `"Quỹ Sinh Hoạt"` |
| `icon` | `string` | Yes | Tên Lucide icon hợp lệ. | `"Wallet"` |
| `color` | `string` | Yes | Mã hex color CSS chuẩn (ví dụ `#3B82F6`). | `"#3B82F6"` |
| `isArchived` | `boolean` | Yes | `false` (Đang hoạt động) hoặc `true` (Đã ẩn). **Số Quỹ active (`isArchived: false`) tối đa là 10** (PDR-009). | `false` |
| `order` | `number` | Yes | Số nguyên không âm $\ge 0$. Điều khiển thứ tự hiển thị danh sách Quỹ. | `0` |
| `defaultBudget` | `number` | Yes | Số nguyên không âm $\ge 0$. Cho phép bằng `0 ₫` (PDR-011). Tối đa 1.000 tỷ VND. | `5000000` |
| `defaultMode` | `'rollover' \| 'reset'` | Yes | Bắt buộc là `'rollover'` (Cộng dồn) hoặc `'reset'` (Đặt lại). | `'rollover'` |
| `createdAt` | `string` | Yes | Chuẩn ISO 8601 UTC. | `"2026-10-09T08:00:00.000Z"` |
| `updatedAt` | `string` | Yes | Chuẩn ISO 8601 UTC. `updatedAt >= createdAt`. | `"2026-10-09T08:00:00.000Z"` |

---

### 2.4 Entity: `FundMonthlyConfig` (Cấu hình Ngân sách Tháng)

Đại diện cho cấu hình ngân sách độc lập của một Quỹ trong một chu kỳ tháng lịch sử hoặc hiện tại cụ thể (PDR-018 - Normalized Store).

```ts
export interface FundMonthlyConfig {
  /**
   * Composite unique identifier: `${fundId}_${yearMonth}`
   * Invariant: Must strictly match `${fundId}_${yearMonth}`.
   * Example: 'fund_life_01_2026-10'
   */
  id: string;

  /** Foreign key reference to Fund.id */
  fundId: string;

  /**
   * Target calendar month.
   * Format: 'YYYY-MM' (Strict regex: ^\d{4}-(0[1-9]|1[0-2])$)
   * Example: '2026-10'
   */
  yearMonth: string;

  /**
   * Explicit allocated budget for this specific month in whole integer VND.
   * Invariant: Integer >= 0. Budget = 0 ₫ is allowed (PDR-011). Max: 1,000,000,000,000 VND.
   */
  monthlyBudget: number;

  /**
   * Calculation mode applied for this specific month:
   * - 'rollover': Nhận Closing Balance của tháng M-1 làm Opening Balance (PDR-022)
   * - 'reset': Bắt đầu với Opening Balance = 0 ₫ (PDR-022)
   */
  budgetMode: BudgetMode;

  /** System audit timestamp when this config record was updated (ISO 8601 UTC) */
  updatedAt: string;
}
```

#### Field Specifications & Invariants for `FundMonthlyConfig`

| Field | Type | Mandatory | Invariants / Validation Rules | Example |
|---|---|---|---|---|
| `id` | `string` | Yes | Phải khớp chính xác cú pháp `${fundId}_${yearMonth}`. Unique trong store. | `"fund_life_01_2026-10"` |
| `fundId` | `string` | Yes | Tham chiếu đến một `Fund.id` tồn tại trong hệ thống. | `"fund_life_01"` |
| `yearMonth` | `string` | Yes | Định dạng `YYYY-MM` theo regex `^\d{4}-(0[1-9]|1[0-2])$`. | `"2026-10"` |
| `monthlyBudget` | `number` | Yes | Số nguyên không âm $\ge 0$. Cho phép bằng `0 ₫` (PDR-011). Tối đa 1.000 tỷ VND. | `5000000` |
| `budgetMode` | `'rollover' \| 'reset'` | Yes | Bắt buộc là `'rollover'` hoặc `'reset'`. | `'rollover'` |
| `updatedAt` | `string` | Yes | Chuẩn ISO 8601 UTC. | `"2026-10-09T08:00:00.000Z"` |

---

## 3. Quỹ Đã Ẩn & Tính Toàn Vẹn Liên Kết (Archived Funds Domain Rules)

Tuân thủ nghiêm ngặt các quyết định PDR-009, PDR-015 và PDR-020:

1. **Khái niệm Ẩn thay vì Xóa (Soft-Archive)**:
   - Hệ thống tuyệt đối không hỗ trợ hard-delete đối với Quỹ. Mọi hành vi gỡ bỏ Quỹ đều chuyển `isArchived = true`.
   - Số lượng Quỹ ẩn **không bị giới hạn** (chỉ giới hạn tối đa 10 Quỹ đang hoạt động `isArchived: false`).
2. **Bảo toàn 100% Lịch sử Giao dịch**:
   - Khi một Quỹ chuyển sang `isArchived: true`, trường `fundId` trên toàn bộ các giao dịch cũ **được giữ nguyên vẹn**, tuyệt đối không bị set về `null` hay `undefined`.
   - Trong Sổ giao dịch và Báo cáo lịch sử, giao dịch gắn Quỹ ẩn vẫn hiển thị đầy đủ tên Quỹ, icon và màu sắc kèm nhãn mờ `(Đã ẩn)`.
3. **Quy tắc Sửa Giao dịch Gắn Quỹ Ẩn (PDR-020)**:
   - Người dùng được phép chỉnh sửa số tiền, ngày giao dịch, danh mục, ghi chú của giao dịch cũ gắn Quỹ ẩn mà **không bắt buộc phải khôi phục Quỹ trước**.
   - Việc sửa giao dịch cũ **không tự động khôi phục Quỹ ẩn**.
   - Khi chỉnh sửa giao dịch cũ:
     - Nếu người dùng giữ nguyên Quỹ cũ: giữ nguyên giá trị `fundId`.
     - Nếu người dùng muốn chuyển sang Quỹ khác: bộ chọn Quỹ **chỉ hiển thị các Quỹ đang Active**, không cho phép chọn Quỹ ẩn khác.
4. **Quy tắc Khôi phục Quỹ Ẩn (Restore Preconditions)**:
   - Hành vi khôi phục một Quỹ ẩn (`restore(id)`) bắt buộc thỏa mãn đồng thời 2 điều kiện:
     1. **Kiểm tra sức chứa (Capacity Check)**: Số lượng Quỹ Active hiện tại phải $< 10$. Nếu đã đủ 10 Quỹ Active, hệ thống từ chối và hướng dẫn người dùng ẩn bớt 1 Quỹ trước.
     2. **Kiểm tra tên duy nhất (Name Conflict Check)**: Tên Quỹ khôi phục không được trùng (sau khi trim và lowercase) với bất kỳ Quỹ nào đang Active. Nếu trùng tên, hệ thống bắt buộc yêu cầu người dùng đổi tên mới trước khi kích hoạt lại.

---

## 4. Derived Domain Models (Non-Persisted — Tính toán On-Demand)

Các mô hình này chỉ tồn tại trong bộ nhớ runtime và được sinh ra bởi các Pure Domain Functions.

### 4.1 `PeriodFilter`

Xác định khung thời gian lọc dữ liệu báo cáo và sổ giao dịch:

```ts
export type PeriodType = 'month' | 'custom';

export interface PeriodFilter {
  type: PeriodType;
  /** Gregorian year (e.g. 2026) */
  year: number;
  /** 1-based month (1 to 12) */
  month: number;
  /** Inclusive ISO start date 'YYYY-MM-DD' */
  startDate: string;
  /** Inclusive ISO end date 'YYYY-MM-DD' */
  endDate: string;
}
```

### 4.2 `CategoryBreakdown`

Tổng hợp số liệu chi tiêu hoặc thu nhập theo từng danh mục trong kỳ:

```ts
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  /** Total whole integer VND for this category */
  totalAmount: number;
  /** Percentage of total (0.0 to 100.0) rounded to 1 decimal place */
  percentage: number;
  /** Number of transactions logged under this category */
  transactionCount: number;
}
```

### 4.3 `SummaryReport`

Báo cáo tài chính tổng quan theo kỳ:

```ts
export interface SummaryReport {
  period: PeriodFilter;
  /** Total income in whole VND (>= 0) */
  totalIncome: number;
  /** Total expense in whole VND (>= 0) */
  totalExpense: number;
  /** Net balance = totalIncome - totalExpense (can be negative) */
  netBalance: number;
  /** Expenses grouped by category, sorted descending by totalAmount */
  expenseBreakdown: CategoryBreakdown[];
  /** Incomes grouped by category, sorted descending by totalAmount */
  incomeBreakdown: CategoryBreakdown[];
  /** Total number of transactions in this period */
  transactionCount: number;
}
```

### 4.4 `FundMonthlySummary`

Báo cáo tình trạng ngân sách và số dư của một Quỹ trong một chu kỳ tháng:

```ts
export interface FundMonthlySummary {
  fundId: string;
  fundName: string;
  fundIcon: string;
  fundColor: string;
  isArchived: boolean;
  yearMonth: string; // 'YYYY-MM'

  /**
   * Số dư đầu kỳ chuyển tiếp từ tháng trước:
   * - Nếu budgetMode === 'rollover': Closing Balance của tháng M-1 (có thể âm, dương hoặc 0)
   * - Nếu budgetMode === 'reset': 0 ₫ (PDR-022 Target-Month Rule)
   */
  openingBalance: number;

  /** Hạn mức ngân sách áp dụng cho tháng này (integer >= 0) */
  monthlyBudget: number;

  /** Chế độ ngân sách của tháng này ('rollover' | 'reset') */
  budgetMode: BudgetMode;

  /** Tổng số tiền chi tiêu được gán vào Quỹ trong tháng (integer >= 0) */
  monthlySpending: number;

  /**
   * Số dư khả dụng hiện tại / Số dư cuối kỳ:
   * Current Balance = Opening Balance + Monthly Budget - Monthly Spending
   * Invariant: Có thể âm khi bội chi (PDR-011)
   */
  currentBalance: number;

  /**
   * Tỷ lệ chi tiêu so với hạn mức (%):
   * - Nếu monthlyBudget > 0: Math.round((monthlySpending / monthlyBudget) * 100)
   * - Nếu monthlyBudget === 0: 0% nếu spending === 0, hoặc cảnh báo vượt hạn mức
   */
  spendingPercentage: number;

  /** Cờ cảnh báo bội chi: true khi currentBalance < 0 */
  isOverBudget: boolean;

  /** Số lượng giao dịch gán vào Quỹ trong tháng */
  transactionCount: number;
}
```

---

## 5. Pure Domain Function Contracts

Tất cả các logic tính toán và xác thực nghiệp vụ đều là hàm thuần túy (pure functions), không side-effects, 100% testable độc lập.

### 5.1 Financial Calculator (`src/utils/calculator.ts`)

```ts
/** Tính toán tổng thu, tổng chi, số dư ròng và phân bổ theo danh mục */
export function calculateSummary(
  transactions: Transaction[],
  categories: Category[],
  period: PeriodFilter
): SummaryReport;

/** Nhóm giao dịch theo danh mục và tính tỷ lệ phần trăm */
export function aggregateByCategory(
  transactions: Transaction[],
  categories: Category[],
  type: TransactionType
): CategoryBreakdown[];
```

### 5.2 Fund Calculator (`src/domain/fundCalculator.ts`)

```ts
/**
 * Tính số dư đầu kỳ của tháng đích dựa trên số dư cuối kỳ tháng trước
 * và chế độ của chính tháng đích (PDR-022 Target-Month Rule).
 */
export function calculateTargetMonthOpeningBalance(
  previousClosingBalance: number,
  targetMonthMode: BudgetMode
): number;

/** Lấy cấu hình ngân sách hiệu lực của Quỹ trong tháng (fallback về default nếu chưa có) */
export function getEffectiveMonthConfig(
  fund: Fund,
  config?: FundMonthlyConfig | null
): { budget: number; mode: BudgetMode };

/** Lọc và tính tổng chi tiêu của Quỹ trong tháng */
export function calculateFundSpending(
  transactions: Transaction[],
  fundId: string,
  yearMonth: string
): { totalSpending: number; count: number };

/** Tính toán số dư và tình trạng ngân sách của Quỹ trong tháng cụ thể (PDR-017, PDR-022) */
export function calculateFundSummary(params: {
  fund: Fund;
  yearMonth: string;
  monthlyConfig?: FundMonthlyConfig | null;
  transactions: Transaction[];
  previousClosingBalance?: number;
}): FundMonthlySummary;

/** Tính chuỗi số dư lũy kế qua nhiều tháng lịch sử theo thứ tự thời gian */
export function calculateHistoricalFundSummaries(params: {
  fund: Fund;
  sortedMonths: string[];
  monthlyConfigs: Map<string, FundMonthlyConfig>;
  transactions: Transaction[];
  initialOpeningBalance?: number;
}): Map<string, FundMonthlySummary>;

/**
 * Tính toán dây chuyền (Cascade Recalculation) khi một giao dịch lịch sử bị sửa/xóa/chuyển ngày (PDR-019).
 * Lan truyền số dư qua các tháng Rollover và dừng lại tại tháng đầu tiên có chế độ Reset.
 */
export function calculateCascadeRecalculation(params: {
  fund: Fund;
  mutatedMonth: string;
  subsequentSortedMonths: string[];
  monthlyConfigs: Map<string, FundMonthlyConfig>;
  transactions: Transaction[];
  previousClosingBalanceOfMutatedMonth?: number;
}): {
  updatedSummaries: Map<string, FundMonthlySummary>;
  stoppedAtMonth?: string;
};
```

### 5.3 Currency Utilities (`src/utils/currency.ts`)

```ts
/** Định dạng số nguyên VND sang chuỗi chuẩn tiếng Việt (ví dụ: 35000 -> "35.000 ₫", -50000 -> "-50.000 ₫") */
export function formatVND(amount: number): string;

/** Định dạng số tiền có dấu chấm phân cách hàng nghìn không kèm đơn vị (ví dụ: 120300 -> "120.300") */
export function formatNumberWithDots(val: number | string): string;

/** Kiểm tra số tiền giao dịch hợp lệ (> 0 và <= 1.000 tỷ VND) */
export function isValidVNDAmount(amount: unknown): amount is number;

/** Kiểm tra số tiền ngân sách hợp lệ (>= 0 và <= 1.000 tỷ VND, cho phép 0 ₫ theo PDR-011) */
export function isValidBudgetAmount(amount: unknown): amount is number;

/** Phân tích cú pháp nhập liệu người dùng (hỗ trợ "35000", "35.000", "35k", "2tr", "2m") */
export function parseAmountInput(rawInput: string): number;

/** Chuyển đổi số tiền VND thành chữ tiếng Việt (ví dụ: 35000 -> "Ba mươi lăm nghìn đồng") */
export function numberToVietnameseWords(amount: number): string;
```

### 5.4 Date Utilities (`src/utils/date.ts`)

```ts
/** Lấy ngày dương lịch hôm nay theo giờ địa phương dạng 'YYYY-MM-DD' */
export function getLocalTodayDateString(): string;

/** Kiểm tra định dạng ngày 'YYYY-MM-DD' hợp lệ */
export function isValidDateString(dateStr: string): boolean;

/** Lấy khoảng ngày bắt đầu và kết thúc của một tháng dương lịch */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string };

/** Định dạng ngày hiển thị tiếng Việt 'DD/MM/YYYY' hoặc nhãn thân thiện 'Hôm nay', 'Hôm qua' */
export function formatDateVN(dateStr: string, includeRelative?: boolean): string;

/** Định dạng tháng năm hiển thị tiếng Việt 'Tháng MM/YYYY' */
export function formatMonthYear(year: number, month: number): string;
```

### 5.5 Domain Validation (`src/domain/validation.ts`)

```ts
/** Xác thực giao dịch và ràng buộc toàn vẹn chéo với danh mục */
export function validateTransaction(transaction: Transaction, category?: Category | null): void;

/** Xác thực thuộc tính danh mục */
export function validateCategory(category: Category): void;

/** Xác thực tên danh mục duy nhất trong cùng loại Thu/Chi (PDR-023) */
export function validateCategoryUniqueness(category: Category, allCategories: Category[]): void;

/** Xác thực Quỹ (giới hạn 10 Quỹ Active và tên duy nhất, PDR-009, PDR-015) */
export function validateFund(fund: Fund, activeFunds?: Fund[]): void;

/** Xác thực cấu hình ngân sách tháng (composite key, monthlyBudget >= 0, mode hợp lệ) */
export function validateFundMonthlyConfig(config: FundMonthlyConfig): void;
```

---

## 6. Domain Invariants Summary

1. **Transaction Amount Invariant**: `amount` là số nguyên dương, $1 \le \text{amount} \le 1.000.000.000.000$ VND.
2. **Budget Invariant**: `defaultBudget` và `monthlyBudget` là số nguyên không âm, $0 \le \text{budget} \le 1.000.000.000.000$ VND. Cho phép Budget = 0 ₫ (PDR-011).
3. **Derived Overdraft Invariant**: `currentBalance` có thể âm khi bội chi. Hệ thống không chặn giao dịch mà chỉ cảnh báo trực quan (PDR-011).
4. **Target-Month Rollover Invariant (PDR-022)**:
   - Chế độ của tháng đích $M+1$ quyết định `openingBalance` của chính nó:
     - `rollover`: Nhận nguyên vẹn `closingBalance` tháng $M$ (đối xứng cho cả $>0, <0, =0$).
     - `reset`: `openingBalance` bằng `0 ₫`.
5. **Historical Configuration Immutability (PDR-013, PDR-018)**:
   - Cấu hình ngân sách (`monthlyBudget`, `budgetMode`) của các tháng đã kết thúc là bất biến. Chỉnh sửa Budget/Mode ở tháng hiện tại không bao giờ hồi tố lên các tháng cũ.
6. **Active Fund Capacity Invariant (PDR-009)**:
   - Số lượng Quỹ có `isArchived: false` không được vượt quá 10 tại bất kỳ thời điểm nào.
7. **Scoped Name Uniqueness**:
   - Tên Quỹ: Duy nhất trong danh sách Quỹ Active (so sánh `trim().toLowerCase()`, PDR-015).
   - Tên Danh mục: Duy nhất trong nhóm cùng `type` (`expense` hoặc `income`) của các danh mục Active (PDR-023).
8. **Category Type Immutability (PDR-023)**:
   - Một khi danh mục đã có ít nhất 1 giao dịch tham chiếu, không được phép thay đổi `type` (`expense` $\leftrightarrow$ `income`).
9. **Referential Integrity for Hidden Funds (PDR-020)**:
   - Việc ẩn Quỹ không bao giờ làm đứt liên kết hoặc null hóa `fundId` trên các giao dịch cũ. Cho phép sửa giao dịch cũ gắn Quỹ ẩn mà không ép buộc khôi phục Quỹ.
10. **Temporal Invariant**:
    - `updatedAt >= createdAt` trên mọi thực thể.
