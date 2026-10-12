# System Architecture: Personal Expense Tracker (QL Thu Chi)

## 1. Architectural Philosophy & Principles

The architectural design is guided by a singular mandate:
> **Simple enough for the current MVP, structured enough to evolve later.**

We explicitly reject enterprise-level over-engineering. We do **not** use Controllers, Factories, DTO transformation layers, Dependency Injection containers, or abstract UseCase classes. Instead, we establish clean, pragmatic boundaries based on standard TypeScript and React best practices.

### Conceptual Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI Components Layer (Presentational & Interactive)       │
│    - Dumb views, dialogs, drawers, KPI cards, form chips   │
└──────────────────────────────┬──────────────────────────────┘
                               │ invokes
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Feature Hooks / Application Logic Layer                  │
│    - React Hooks (useTransactions, useCategories, useReport)│
│    - Coordinates state, calls domain services & repositories│
└──────────────────────────────┬──────────────────────────────┘
                               │ depends on
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Domain Services & Pure Business Utilities               │
│    - Pure functions: calculation, aggregation, formatting   │
│    - Zero UI or storage coupling; 100% unit testable        │
└──────────────────────────────┬──────────────────────────────┘
                               │ depends on
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Repository Interfaces (Abstract Contracts)               │
│    - ITransactionRepository, ICategoryRepository            │
│    - Pure async TypeScript interfaces                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ implements
┌──────────────────────────────▼──────────────────────────────┐
│ 5. Infrastructure / Persistence Layer                       │
│    - IndexedDB / LocalStorage implementation                 │
│    - Serialization, schema validation, storage operations   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Responsibilities & Boundaries

### 2.1 Layer 1: UI Components
* **Scope**: Rendering HTML, capturing user input events, handling local presentation state (e.g., whether an input is focused or a dropdown is open).
* **Constraints**:
  * No direct calculations of balances, totals, or percentages in components.
  * No knowledge of storage APIs (`localStorage`, `indexedDB`).
  * Interacts exclusively with **Feature Hooks**.

### 2.2 Layer 2: Feature Hooks / Application Logic
* **Scope**: Encapsulates React state (loading, error, cached entities), coordinates user actions, and calls repositories and domain services.
* **Examples**:
  * `useTransactions(filter: PeriodFilter)`: Loads and manages transaction state.
  * `useCategories()`: Provides available income/expense categories.
  * `useFunds(period: PeriodFilter)`: Quản lý danh sách Quỹ (Active & Archived), cấu hình ngân sách tháng, và tính toán số dư dẫn xuất thời gian thực.
  * `useFinancialSummary(transactions: Transaction[], period: PeriodFilter)`: Runs pure calculation service on current transactions to produce `SummaryReport`.
* **Constraints**:
  * Keeps components simple and declarative.
  * Does not perform low-level database operations directly; calls repository interfaces.

### 2.3 Layer 3: Domain Services & Pure Logic
* **Scope**: Stateless, deterministic financial calculations and business rule validation.
* **Examples**:
  * `calculateSummary(transactions, period): SummaryReport`
  * `groupExpensesByCategory(transactions): CategoryBreakdown[]`
  * `calculateFundSummary(fund, config, transactions): FundMonthlySummary`: Tính số dư đầu kỳ, đã chi, số dư khả dụng theo Rollover/Reset (PDR-017, PDR-022).
  * `calculateCascadeRecalculation(fundId, changedMonth, ...)`: Tính toán lại chuỗi số dư lan truyền khi giao dịch lịch sử bị sửa (PDR-019).
  * `parseAmountInput(rawString): number`
  * `formatVND(amount): string`
  * `validateTransactionPayload(data): ValidationResult`
  * `validateFundPayload(data, activeFunds): ValidationResult`: Kiểm tra giới hạn 10 Quỹ và tên duy nhất (PDR-009, PDR-015).
* **Constraints**:
  * **Pure functions only**: Given input $X$, always produces output $Y$ without side effects.
  * Zero dependencies on React (`useState`, `useEffect`) or browser storage.

### 2.4 Layer 4: Repository Interfaces
* **Scope**: Defines data access contracts using TypeScript interfaces.
* **Contracts**:
  ```ts
  export interface ITransactionRepository {
    getAll(): Promise<Transaction[]>;
    getByPeriod(startDate: string, endDate: string): Promise<Transaction[]>;
    getById(id: string): Promise<Transaction | null>;
    create(transaction: Transaction): Promise<void>;
    update(transaction: Transaction): Promise<void>;
    delete(id: string): Promise<void>;
    bulkInsert(transactions: Transaction[]): Promise<void>;
    getByFund(fundId: string, startDate?: string, endDate?: string): Promise<Transaction[]>;
  }

  export interface ICategoryRepository {
    getAll(): Promise<Category[]>;
    getById(id: string): Promise<Category | null>;
    create(category: Category): Promise<void>;
    update(category: Category): Promise<void>;
    delete(id: string): Promise<void>; // Soft archive
    seedDefaults(defaults: Category[]): Promise<void>;
  }

  export interface IFundRepository {
    getAll(includeArchived?: boolean): Promise<Fund[]>;
    getById(id: string): Promise<Fund | null>;
    create(fund: Fund): Promise<void>;
    update(fund: Fund): Promise<void>;
    archive(id: string): Promise<void>;
    restore(id: string): Promise<void>;
    countActive(): Promise<number>;
    getMonthlyConfig(fundId: string, yearMonth: string): Promise<FundMonthlyConfig | null>;
    setMonthlyConfig(config: FundMonthlyConfig): Promise<void>;
    getMonthlyConfigsForPeriod(yearMonth: string): Promise<FundMonthlyConfig[]>;
    getMonthlyConfigsForFund(fundId: string): Promise<FundMonthlyConfig[]>;
  }
  ```
* **Constraints**:
  * Keeps the application layer completely decoupled from the actual storage engine.

### 2.5 Layer 5: Infrastructure / Persistence
* **Scope**: Concrete implementation of repository interfaces interacting with browser storage.
* **Constraints**:
  * Handles serialization/deserialization, error catching, schema migrations, and storage corruption recovery.

---

## 3. Local-First Persistence Evaluation & Recommendation

We evaluated the two primary browser-native storage engines against the needs of a local-first financial application:

### 3.1 Comparative Evaluation Matrix

| Criteria | `localStorage` | `IndexedDB` (via lightweight `idb` / native wrapper) |
|---|---|---|
| **Data Size Limit** | Strict ~5MB per origin. | 50MB+ (up to hundreds of MB or available disk). |
| **I/O Nature** | **Synchronous & blocking**. Large reads/writes block the UI thread during parsing. | **Asynchronous & non-blocking**. Smooth frame rates during operations. |
| **Data Structure** | Strings only (`JSON.stringify` / `JSON.parse` required for entire arrays). | Structured clone algorithm (stores native objects, numbers, booleans, dates). |
| **Querying / Indexing** | None. Must read entire payload into memory to filter or sort. | Built-in indexes (index by `transactionDate`, `categoryId`). |
| **Reliability on Crash** | Susceptible to corrupted partial writes if write fails mid-string. | Transactional (ACID properties; writes succeed or rollback cleanly). |
| **Browser Support** | 100% across all modern and legacy browsers. | 100% across all modern mobile and desktop browsers. |
| **Future Migration** | Difficult to transition smoothly to offline sync engines. | Natural stepping stone for Dexie, SQLite WASM, or cloud sync. |
| **Implementation Complexity** | Very Low (`getItem`, `setItem`). | Moderate (Native API is verbose; solved with a clean ~80-line wrapper or `idb`). |

### 3.2 Explicit Recommendation & Decision

**Selected Storage: IndexedDB (with a lightweight promise-based wrapper)**.

* **Rationale**:
  1. **Non-blocking UI**: Even with 5,000 transactions accumulated over multiple years, reading and querying by month in IndexedDB will never cause UI stutters or jank on mobile devices.
  2. **Transactional Integrity**: Financial records require write safety. IndexedDB transactions prevent corrupting the entire database if an app is closed mid-write.
  3. **Repository Pattern Protection**: Because our repository interface returns `Promise<T>`, the UI and feature hooks never care whether IndexedDB or LocalStorage is used underneath.
  4. **Fallback Safety**: If a browser environment restricts IndexedDB (e.g. strict private mode in older browsers), a lightweight LocalStorage fallback can implement the exact same `ITransactionRepository` interface without changing any business or UI code.

---

## 4. State Management Strategy

* **No Redux / Zustand / MobX overhead**: The MVP has a tightly bounded scope (transactions, categories, active month filter).
* **React Context + Custom Hooks**:
  * `TransactionProvider` manages the active transactions in memory, initialized from `ITransactionRepository`.
  * Write operations (create, update, delete) update the persistent storage via the repository and then update the React state cache (optimistic or write-through).
  * `CategoryProvider` holds default and user-defined categories.
* **Derived State via Selectors**:
  * The current balance and monthly reports are **never stored in state or storage**.
  * They are derived on the fly using `useMemo` calling the pure `calculateSummary` domain utility. This completely eliminates stale cache bugs.

---

## 5. Dependency Direction

Dependencies flow strictly in one direction:

$$\text{UI Components} \longrightarrow \text{Feature Hooks} \longrightarrow \text{Domain Services} \longleftarrow \text{Repository Interfaces} \longleftarrow \text{Infrastructure}$$

* The Domain Model and Domain Services have **zero external dependencies**.
* The Repository Interfaces define how data must be delivered, not how it is stored.
* Any infrastructure changes (e.g., swapping IndexedDB for an API or SQLite) require zero changes in the Domain or UI layers.

---

## 6. Testing Strategy

1. **Unit Tests (High ROI)**:
   * 100% coverage for pure domain utilities:
     * VND currency parsing and formatting (`parseAmountInput`, `formatVND`).
     * Financial calculations (`calculateSummary`, category group totals, edge cases with zero/negative numbers).
     * Input validation schemas (rejecting strings, floats, zero amounts).
2. **Repository Integration Tests**:
   * Test repository CRUD operations against fake in-memory or indexedDB test store.
   * Test migration, seeding default categories, and empty storage initialization.
3. **Ergonomic & UX Acceptance Testing**:
   * Validate that logging a transaction completes in $< 5$ seconds with 4 interactions.

---

## 7. Future Cloud Migration Path

When transitioning from MVP (Local-First) to a multi-device synced product:
1. Create `CloudTransactionRepository implements ITransactionRepository`.
2. Introduce an offline synchronization queue (or CRDT/timestamp-based sync engine).
3. **No UI components, hooks, or calculation services need to be rewritten**, because all interactions already consume the abstract `ITransactionRepository` interface.
