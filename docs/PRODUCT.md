# Product Definition: KentoPrice — Personal Expense Tracker

## 1. Product Overview & Goal

The **Personal Expense Tracker** is a lightweight, responsive personal finance web application built around one core, friction-free interaction loop:

> **Open the app → Select Income or Expense → Enter amount & category → Save.**

### Guiding North Star
Record an expense (such as *"35,000 VND for morning coffee"*) in **under 5 seconds** with zero unnecessary taps or cognitive friction, on both mobile and desktop browsers.

---

## 2. Target Users & Personas

### 2.1 Primary Target User
* **The Daily Meticulous Spender**: An individual who wants to track everyday daily expenses (food, transport, shopping, utilities) without linking bank accounts or dealing with tedious multi-step budgeting setup.
* **The Mobile-First Consumer**: Needs to record transactions immediately at checkout or on the go using a smartphone.
* **The Desktop Weekend Reviewer**: Prefers checking spending summaries, monthly category breakdowns, and financial health on a larger desktop screen.

### 2.2 Key Pain Points Addressed
* Traditional finance apps are bloated with ads, banking integrations, and complex investment analytics.
* High friction during data entry causes users to abandon tracking after a few days.
* Lack of responsive desktop experience makes monthly reviews cramped on mobile.

---

## 3. Core Use Cases

| ID | Use Case | Actor Flow | Success Criteria |
|---|---|---|---|
| **UC-01** | **Quick Expense Entry** | Tap Expense → Enter amount → Pick Category → Tap Save (Optional: note, custom date) | Saved in < 5 seconds; instant dashboard balance update |
| **UC-02** | **Quick Income Entry** | Tap Income → Enter amount → Pick Category → Tap Save (Optional: note, custom date) | Balance incremented; reflected in recent transactions |
| **UC-03** | **Dashboard Overview** | Open app → View Total Income, Total Expense, Net Balance, Recent 5-10 transactions | Loaded instantly with clear financial status indicators |
| **UC-04** | **Transaction History & Management** | Browse list → Filter/Sort → Click item to Edit amount/category/note/date → Or Delete | State updates reliably; delete requires confirmation |
| **UC-05** | **Monthly Reports & Category Inspection** | Navigate to Reports → Select Month/Year → View Income vs Expense bars + Category breakdown → Click category to view transactions | Visual clarity on top spending categories |

---

## 4. Scope Definition

### 4.1 In Scope (MVP)
* **Transaction Engine**:
  * Create Income & Expense transactions
  * Fields: `amount` (required, > 0), `type` (income/expense), `category` (required), `date` (defaults to today/now), `note` (optional string)
  * Read, Edit, and Delete transactions with validation
* **Default Categories**:
  * Expense: Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Others
  * Income: Salary, Freelance, Investment, Gifts, Others
* **Dashboard**:
  * Key Metrics: Total Income, Total Expense, Current Net Balance
  * Quick-action buttons: "+ Expense" (primary accent) & "+ Income"
  * Recent transactions list with type indicators (green for income, red/rose for expense)
  * Quick link to full reports
* **Reports**:
  * Monthly overview (Income vs Expense total)
  * Expenses by Category breakdown (visual representation + percentage + amount)
  * Category drill-down (filter transactions by selected category in the active month)
* **Local Data Persistence (Client-Side)**:
  * Fast client-side storage for instant offline loading without account setup.
  * **Known MVP Limitations**:
    - Browser data clearing or private browsing mode will wipe records.
    - Device/hardware failure causes permanent loss without backup.
    - No cross-device synchronization in MVP.
  * *Resilience Note*: Export/Import (JSON/CSV) is designated as a critical post-MVP milestone.
* **Responsive First-Class Experience**:
  * Mobile: Bottom navigation / thumb-accessible action triggers, clean touch targets (min 44x44px)
  * Desktop: Balanced multi-column dashboard, efficient horizontal space usage, comfortable table/card views

### 4.2 Out of Scope (Explicitly Deferred)
* User authentication & accounts (Login / Register / OAuth)
* Cloud database synchronization
* Multi-wallet / Multi-account management
* Budget limits & proactive alert notifications
* Recurring / scheduled transactions
* Financial goals & savings buckets
* AI financial assistant / LLM categorization
* Bank API / Open Banking / SMS parsing integration
* Investment / Portfolio / Crypto tracking
* Social features & shared ledgers
* Export to PDF / Excel (designated as high-priority resilience feature post-MVP)

---

## 5. UX & Design Principles (Calm, Minimal, Data-First)

1. **Hierarchy & Usability First**:
   * **Data hierarchy > Usability > Readability > Decoration**.
   * Avoid decorative clutter. Glassmorphism and elevation are used sparingly (e.g. modals/drawers and active cards only) rather than coating every surface.
   * Calm, clean, dark-first fintech palette: deep charcoal/slate base, high-contrast readable text, clear semantic feedback.
2. **The "Under 5 Seconds" Acceptance Criterion**:
   * Minimum required data: **Type**, **Amount**, **Category**, and **Date (defaults to today)**.
   * Optional fields (Notes, custom dates) are secondary and must never block the primary action.
   * Expected primary interaction count: **Exactly 4 user actions** from dashboard to saved record:
     1. Tap `[+ Chi]` (or `[+ Thu]`)
     2. Input amount
     3. Select category chip
     4. Tap `[Lưu]`
3. **Semantic Colors with High Contrast**:
   * Income: Mint/Emerald green (`#10B981` / `#059669`) with >= 4.5:1 WCAG contrast
   * Expense: Crimson/Rose red (`#EF4444` / `#DC2626`) with >= 4.5:1 WCAG contrast
   * Primary Brand / Actions: Trust blue (`#3B82F6`)
4. **Professional Typography & Iconography**:
   * High legibility sans-serif font pairing (Inter / Quicksand / system stack) with tabular figures for numbers (`font-variant-numeric: tabular-nums`).
   * Semantic SVG icons (Lucide / Heroicons style) — **never raw emojis as interface icons**.
5. **Contextual Desktop Experience**:
   * Desktop is not a blown-up mobile screen. It provides balanced horizontal density, comfortable data tables, and side-by-side summary cards.

---

## 6. Information Architecture (IA)

```
[ App Root ]
   │
   ├── Dashboard (Default View)
   │     ├── Balance Summary Card (Net Balance, Total Income, Total Expense)
   │     ├── Quick Actions ([+ Expense] primary, [+ Income])
   │     └── Recent Transactions (Latest 5 items + "View All" link)
   │
   ├── Transaction Entry (Modal / Bottom Sheet / Dedicated Drawer)
   │     ├── Type Selector (Expense / Income toggle)
   │     ├── Amount Input (Large numeric display with instant currency format)
   │     ├── Category Grid / Selector
   │     ├── Fund Selector (Optional 0..1, Active Funds only — PDR-008)
   │     ├── Date Selector (Defaults to today)
   │     ├── Note Input (Optional)
   │     └── Save Button (Primary action)
   │
   ├── Transactions Ledger View
   │     ├── Search / Month filter
   │     ├── Transaction List (Grouped by date, with Fund indicator)
   │     └── Item Actions: Click to Edit | Delete confirmation dialog
   │
   ├── Funds Management View (Quản lý Quỹ — PDR-016 Confirmed)
   │     ├── Month / Period Selector & Budget Overview
   │     ├── Active Funds List (Cards with progress bar, Rollover/Reset mode tags)
   │     ├── Create / Edit Fund Modal (Live Impact Preview, Name validation)
   │     └── Archived Funds View (History preservation & Restore with capacity check)
   │
   └── Reports View
         ├── Month / Period Selector
         ├── Financial Summary (Income, Expense, Savings Rate)
         ├── Category Breakdown (Bar / Donut distribution)
         └── Category Drilldown (Filtered list of transactions for selected category)
```

---

## 7. Future Expansion Boundaries

The application is structured with strict separation of layers so future capabilities can be plugged in without refactoring core logic:
* **Storage Abstraction**: The data layer is decoupled behind an interface (`TransactionRepository`), allowing effortless swap from `LocalStorage / IndexedDB` to `Supabase / Firebase / REST API` when cloud sync is introduced.
* **Multi-Currency Ready**: Currency formatting and calculations are centralized in isolated pure utility functions.
* **Category Customization**: Categories are modeled as dynamic entities rather than hardcoded enums, preparing the app for user-created custom categories.
* **Fund Management (Quản lý Quỹ)**: Detailed in `docs/UX_FLOW_FUND_MANAGEMENT.md` and `docs/DECISIONS_LOG.md` (PDR-008 to PDR-022), introducing purpose-driven envelope budgeting with 0..1 transaction tagging while maintaining frictionless under-5-second entry.
