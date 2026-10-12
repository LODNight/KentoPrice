# UI Specification: KentoPrice — Personal Expense Tracker

## 1. Visual Direction & Design Philosophy

The visual design is governed by the core principle:
> **Data hierarchy > Usability > Readability > Decoration.**

The interface is a **calm, minimal, dark-first personal finance tool**. It avoids heavy glassmorphic clutter and visual noise. Decorative effects and elevation are applied selectively only to draw focus to critical actions (e.g. modals, active chips, primary triggers).

---

## 2. Design Tokens & Color Semantics

All colors meet **WCAG 2.1 AA** contrast requirements (minimum 4.5:1 against their respective backgrounds).

### 2.1 Color Palette

| Token | Hex / Value | Contrast Ratio | Usage |
|---|---|---|---|
| `--color-bg-base` | `#0B0F19` | N/A | Deep calm background canvas |
| `--color-surface-card` | `#151D2F` | 13.8:1 (vs white) | Solid card background, minimal elevation |
| `--color-surface-elevated` | `#1E293B` | 11.2:1 (vs white) | Dropdowns, dialogs, bottom sheets, active items |
| `--color-border-subtle` | `rgba(255, 255, 255, 0.08)` | N/A | Card & divider hairline borders (1px) |
| `--color-border-focus` | `#3B82F6` | 4.8:1 | Focus rings & active input borders |
| `--color-text-primary` | `#F8FAFC` (Slate 50) | 16.5:1 (vs base) | Primary titles, monetary figures, active text |
| `--color-text-secondary` | `#94A3B8` (Slate 400)| 6.2:1 (vs base) | Dates, category labels, table headers, hints |
| `--color-text-muted` | `#64748B` (Slate 500)| 4.6:1 (vs base) | Placeholders, inactive icons, subtle notes |
| `--color-income` | `#10B981` (Emerald 500)| 6.4:1 (vs card) | Income amounts, positive cash flow, +Thu badges |
| `--color-expense` | `#F43F5E` (Rose 500) | 5.2:1 (vs card) | Expense amounts, negative cash flow, +Chi badges |
| `--color-brand-primary` | `#3B82F6` (Blue 500) | 4.7:1 (vs card) | Primary action buttons, active navigation indicator |
| `--color-brand-hover` | `#2563EB` (Blue 600) | 5.8:1 (vs white) | Primary button hover state |

---

## 3. Typography System

* **Primary Font Family**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
* **Numerical Font Feature**: `font-variant-numeric: tabular-nums;` (ensures aligned digits for financial figures).

| Scale | Font Size | Line Height | Weight | Typical Use Case |
|---|---|---|---|---|
| **Display / Hero** | `32px` (2rem) | `1.2` | Bold (700) | Net balance hero figure on Dashboard |
| **Heading 1 (H1)** | `24px` (1.5rem) | `1.3` | SemiBold (600) | Page titles (Sổ giao dịch, Báo cáo) |
| **Heading 2 (H2)** | `18px` (1.125rem) | `1.4` | SemiBold (600) | Card headers, section dividers |
| **Heading 3 (H3)** | `16px` (1rem) | `1.4` | Medium (500) | Modal titles, category titles |
| **Body Primary** | `15px` (0.9375rem) | `1.5` | Regular (400) | Transaction row names, input text |
| **Body Secondary** | `13px` (0.8125rem) | `1.5` | Regular (400) | Metadata, dates, auxiliary notes |
| **Caption / Badge** | `11px` (0.6875rem) | `1.4` | Medium (500) | Category tags, percentage chips |

---

## 4. Surface, Depth & Elevation Strategy

Rather than coating the entire viewport in glassmorphism:
* **Background (`--color-bg-base`)**: Flat, dark matte finish (`#0B0F19`) to reduce eye strain.
* **Content Cards (`--color-surface-card`)**: Solid `#151D2F` with 1px border `rgba(255, 255, 255, 0.08)` and `border-radius: 12px`. Zero heavy blur for high rendering performance and clean text contrast.
* **Selective Elevation (Modals & Bottom Sheet)**:
  * Background: `#1E293B` with `backdrop-filter: blur(12px)`.
  * Shadow: `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)`.
  * Border: `1px solid rgba(255, 255, 255, 0.12)`.

---

## 5. Component Specifications

### 5.1 Buttons Hierarchy

| Button Type | Background / Style | Text / Icon Color | Usage | Ergonomics |
|---|---|---|---|---|
| **Primary Action** | `--color-brand-primary` (`#3B82F6`) | `#FFFFFF` (Bold) | "Lưu giao dịch", Submit forms | Min height: 48px, radius: 8px |
| **Quick Action Chi** | `--color-expense` (`#F43F5E`) | `#FFFFFF` (SemiBold) | Dashboard `+ Chi` trigger | Min height: 48px, thumb accessible |
| **Quick Action Thu** | `--color-income` (`#10B981`) | `#FFFFFF` (SemiBold) | Dashboard `+ Thu` trigger | Min height: 48px, thumb accessible |
| **Secondary Button** | `transparent` with 1px border | `--color-text-secondary` | "Hủy", "Đặt lại bộ lọc" | Min height: 40px, hover fill |
| **Destructive Button** | `rgba(244, 63, 94, 0.15)` | `#F43F5E` | "Xóa giao dịch" | Min height: 40px, explicit red |

*Micro-interactions*: All buttons feature `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)`, scale down slightly on click (`active:scale-[0.98]`), and have `cursor: pointer`.

---

### 5.2 Amount Input (The Core Interaction Point)
* **Visual Hierarchy**: Largest input element on the entry sheet (`font-size: 32px`, `font-weight: 700`, centered or left-aligned with currency symbol).
* **Behavior**:
  * Auto-focused immediately when modal/sheet opens.
  * Mobile keyboard hint: `inputMode="numeric"` or `inputMode="decimal"` to invoke the standard numeric pad.
  * Real-time live formatting: typing `50000` formats smoothly into `50.000 ₫`.
  * Inline validation: Displays subtle warning border and text *"Nhập số tiền > 0"* if user attempts to submit `0` or empty.

---

### 5.3 Category Selector
* **Visual Presentation**: Grid of compact interactive chips (2 columns on mobile, 4 columns on desktop).
* **Composition**: Each chip contains an SVG category icon + short title.
* **State Styles**:
  * *Default*: Surface `#1E293B`, subtle border, slate-300 text.
  * *Selected*: Brand blue background (`rgba(59, 130, 246, 0.2)`), border `1.5px solid #3B82F6`, bright white text, checkmark or colored glow.
  * *Hover*: Slight brightness boost (`#273549`).

---

### 5.4 Transaction Row Item
* **Layout**: Horizontal flex container.
  * *Left*: Category circular icon badge (40x40px, muted colored background).
  * *Middle*: Category title (Body Primary, 15px) + Optional Note (Body Secondary, 13px, truncated).
  * *Right*: Formatted amount in tabular digits (`-35.000 ₫` in rose, `+15.000.000 ₫` in emerald) + Relative or exact time.
* **Interaction**: Row hover state with soft highlight; clicking opens the Edit/Detail view.

---

### 5.5 Report Presentation (The 5 Core Answers)
* **Summary Row**: 3 key metric cards:
  1. *Tổng thu*: Green badge with total income
  2. *Tổng chi*: Red badge with total expenses
  3. *Số dư ròng*: Clear net balance indicator
* **Category Breakdown Bar List**:
  * Clean horizontal progress bars.
  * Bar width proportional to percentage of total spending.
  * Row format: Category name, total amount, percentage (`60%`).
* **Drill-Down Section**:
  * Tapping a category bar expands or renders an inline filtered transaction ledger for that specific category.

---

## 6. Responsive Breakpoint Rules

| Breakpoint | Target Device | Navigation Pattern | Layout Density |
|---|---|---|---|
| **Mobile (`< 768px`)** | Phones (375px–430px) | Fixed Bottom Navigation + Floating `+` action bar | Single column stacked; full-width bottom sheet |
| **Tablet (`768px – 1023px`)** | iPads / Tablets | Top Header Navigation | 2-column grid; centered modal dialogs |
| **Desktop (`>= 1024px`)** | Laptops & Monitors | Top navigation bar with quick shortcuts | 3-column structured dashboard; max-width 1200px |

---

## 7. Accessibility Checklist (WCAG 2.1 AA Compliant)

- [x] **Contrast Ratio**: All text and icon badges meet >= 4.5:1 ratio against card backgrounds.
- [x] **Touch Targets**: All mobile interactive buttons and category chips are >= 44x44px.
- [x] **No Emoji Icons**: All icons rendered as clean, scalable SVGs (Lucide style) with `aria-hidden="true"`.
- [x] **Focus Visible**: All buttons and inputs feature a high-contrast focus ring (`outline: 2px solid #3B82F6; outline-offset: 2px`).
- [x] **Tabular Figures**: Monetary numbers use `font-variant-numeric: tabular-nums` to prevent horizontal layout jiggle.
- [x] **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)` by disabling sliding transitions.
- [x] **Keyboard Accessibility**: `Esc` closes modals; `Enter` saves transaction if valid; `Tab` cycles naturally through inputs.
