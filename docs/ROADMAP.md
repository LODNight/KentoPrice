# Project Roadmap: Personal Expense Tracker (QL Thu Chi)

## Roadmap Overview

This roadmap defines the structured, iterative delivery process for the personal expense tracker application. Progress moves sequentially from product definition to a refined, test-covered MVP release.

---

## Phase Breakdown

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5 ──▶ Phase 6
Product      UX & UI      Architecture  UI Prototype Core Dev     Testing &    MVP
Definition   Specs        & Data Model  (Mock Data)  (Full Logic) Refinement   Release
```

---

### Phase 0: Product Definition (Current Phase)
* **Goal**: Establish the functional boundary, core user journeys, non-goals, and governance records.
* **Deliverables**:
  * [x] `docs/PRODUCT.md`: Product goal, personas, use cases, scope, IA, future boundaries.
  * [x] `docs/ROADMAP.md`: Phase-by-phase execution plan and acceptance criteria.
  * [x] `docs/DECISIONS_LOG.md`: Architecture & Product Decision Records (ADR/PDR).
* **Exit Criteria**: Product goals agreed upon with zero ambiguity on MVP boundaries.

---

### Phase 1: UX Definition & Visual Specification
* **Goal**: Design the interaction flows, layout rules, state transitions, and responsive behavior in compliance with workspace UI skills (`ui-ux-pro-max`, `design-system`).
* **Deliverables**:
  * [x] `docs/UX_FLOW.md`:
    * Step-by-step navigation flows for Add Income/Expense, Edit, Delete, View Reports.
    * Mobile thumb-zone optimization and desktop layout parity.
    * Empty states, error handling, inline validation rules.
  * [x] `docs/UI_SPEC.md`:
    * Design tokens (color palette: trust blue, emerald income, rose expense, dark glass card surfaces).
    * Typography hierarchy (Quicksand / Inter sans-serif system).
    * Component specifications (Buttons, Inputs, Category Chips, Metric Cards, Modal/Bottom Sheet).
    * Responsive breakpoint specifications (Mobile: 375px–767px, Desktop: 768px+).
* **Exit Criteria**: UX flows validated for <5-second entry target; UI specification covers every user state.

---

### Phase 2: Architecture & Data Modeling (Completed)
* **Goal**: Establish clean software architecture, data schemas, storage contracts, and technology stack.
* **Deliverables**:
  * [x] `docs/ARCHITECTURE.md`:
    * Layered architecture (UI Layer → Application/Domain Services → Repository Layer).
    * Technology stack selection (Vite + React + TypeScript).
    * Local-first persistence strategy (IndexedDB recommendation with repository interface).
    * Fund Management architecture additions (Layer 2 Feature Hooks, Layer 3 Pure Services, Layer 4 `IFundRepository`).
  * [x] `docs/DATA_MODEL.md`:
    * Entity definitions (`Transaction`, `Category`, `SummaryReport`, `PeriodFilter`).
    * Official Fund Management entities (`Fund`, `FundMonthlyConfig`, `Transaction.fundId`, `FundMonthlySummary`).
  * [x] `docs/DATA_CONTRACT.md`:
    * Storage repository interfaces, input validation schemas, serialization, and migration contracts.
    * IndexedDB Schema Version 2 (`funds`, `fund_monthly_configs`, `transactions.fundId`), `IFundRepository`, JSON Backup/Restore v2.
  * [x] `docs/DECISIONS_LOG.md`:
    * PDR-018: Phê duyệt Phương án A (Normalized Object Store riêng biệt cho cấu hình ngân sách theo tháng).
* **Exit Criteria**: Clean boundary between business logic and UI; modular repository pattern ready for future cloud sync; data contract v2 finalized.

---

### Phase 2.1: Fund Management Extension (Completed)
* **Status**: Core Implementation & Unit/Integration Tests Completed (100% Pass).
* **Deliverables**:
  * [x] UX Specifications & Rules (`docs/UX_FLOW_FUND_MANAGEMENT.md`, `docs/UX_RULES.md`, PDR-008..022)
  * [x] Wireframes & Screen Blueprints (`docs/WIREFRAMES.md` Wireframes 0–10)
  * [x] Data Architecture & Schema v2 (`docs/DATA_MODEL.md`, `docs/DATA_CONTRACT.md`, `docs/DECISIONS_LOG.md` PDR-018)
  * [x] Core Implementation:
    * [x] 1. Domain Types & Validation schemas (`src/types/index.ts`, `src/domain/validation.ts`)
    * [x] 2. Pure Financial Calculation Engine & Unit Tests (`src/domain/fundCalculator.ts`, `src/domain/fundCalculator.test.ts`)
    * [x] 3. IndexedDB Schema v2 Migration & `IndexedDBFundRepository` (`src/infrastructure/indexedDB/`)
    * [x] 4. Application Feature Hook `useFunds` (`src/hooks/useFunds.ts`)
    * [x] 5. UI Integration: Quỹ Tab trên Navigation, Danh sách Quỹ, Form Tạo/Sửa Quỹ, Đổi Chế độ, Ẩn/Khôi phục, Gán Quỹ vào Giao dịch.

### Phase 3: UI Prototype (Mock Data) (Completed)
* **Goal**: Build the responsive layout and interactive screens using realistic mock data to validate UX feel before persisting data.
* **Deliverables**:
  * [x] Working interactive UI components:
    * [x] Dashboard with Balance & Quick Entry triggers.
    * [x] Add Transaction modal / bottom drawer with numeric keypad / input & category selector.
    * [x] Transactions list with filters.
    * [x] Reports screen with category distribution and drill-down.
* **Exit Criteria**: Responsive UI behaves smoothly on mobile and desktop viewports; user experience confirmed before persistent wiring.

---

### Phase 4: Core Implementation (Completed)
* **Goal**: Implement persistent business logic, state management, calculation utilities, and full CRUD.
* **Deliverables**:
  * [x] 1. Default categories & category provider (`initialCategories.ts`, `useCategories.ts`)
  * [x] 2. Data storage repository & transaction model (`IndexedDBTransactionRepository`, `IndexedDBCategoryRepository`)
  * [x] 3. Create transaction flow (with input sanitization and cross-entity category validation)
  * [x] 4. Read transactions (filtering, period bound indexing, sorting by date)
  * [x] 5. Edit transaction (with persistent update & summary recalculation)
  * [x] 6. Delete transaction (with confirmation safeguard modal)
  * [x] 7. Pure financial calculations (Income, Expense, Balance, Category totals, 21 unit tests passing)
  * [x] 8. Monthly reports engine with category drill-down
* **Exit Criteria**: Full CRUD operational with local persistence; business calculation unit tests passing.

---

### Phase 5: Testing & Refinement
* **Goal**: Thorough testing, edge case validation, ergonomics validation, and polishing.
* **Deliverables**:
  * Automated unit tests for calculation engine, date helpers, and repository logic.
  * Validation testing: 0 amount, negative amount, string amounts, leap years, month boundaries.
  * Ergonomics test for the core benchmark: *"Record 35,000 VND coffee in < 5 seconds"*.
  * Accessibility check: contrast ratios >= 4.5:1, keyboard navigation, visible focus rings.
* **Exit Criteria**: All tests passing; zero critical console errors; confirmed effortless speed on mobile.

---

### Phase 6: MVP Release & Documentation
* **Goal**: Final production build verification, deployment readiness, and comprehensive project documentation.
* **Deliverables**:
  * Clean, optimized production bundle build.
  * Verified persistent data survival across browser refreshes and tab closures.
  * Polished user documentation (`README.md` with setup and usage instructions).
* **Exit Criteria**: Production build verified, zero build warnings, ready for local execution or static deployment.
