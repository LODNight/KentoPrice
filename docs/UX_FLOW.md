# UX Flows & Interaction Architecture: Personal Expense Tracker

## 1. Executive UX Summary & Core Interaction Target

The primary objective of the application is:
> *"Can the user record a normal transaction immediately, understand their current spending, and leave the app without unnecessary friction?"*

### Core Acceptance Criterion: "Under 5 Seconds"
A standard transaction recording must take **less than 5 seconds** and require **exactly 4 user interactions**:
1. **Action 1**: Tap `+ Chi` (or `+ Thu`) from the main view.
2. **Action 2**: Input amount (e.g. `35000` — formatted automatically as `35.000 ₫`).
3. **Action 3**: Tap category chip (e.g., `Cà phê / Ăn uống`).
4. **Action 4**: Tap `Lưu giao dịch` (or press `Enter` on desktop).

Optional fields (Notes, custom dates) are visually and functionally unobtrusive and **never** block completion.

---

## 2. Comparison of Transaction-Entry UX Patterns

We evaluate the two competing transaction-entry paradigms against our core product criteria:

```
Pattern A: Dashboard-First
[ App Launch ] ──▶ [ Dashboard: Balance & Recents ] ──▶ [ Tap +Chi/+Thu ] ──▶ [ Entry Sheet / Modal ] ──▶ [ Save ]

Pattern B: Transaction-First
[ App Launch ] ──▶ [ Immediate Entry Screen ] ──▶ [ Enter Amount & Category ] ──▶ [ Save ] ──▶ [ View Ledger ]
```

### 2.1 Comparative Analysis Matrix

| Evaluation Criteria | Pattern A: Dashboard-First | Pattern B: Transaction-First |
|---|---|---|
| **Primary Interaction Count** | **4 actions** (Open → Tap `+Chi` → Amount/Category → Save) | **3 actions** (Open → Amount/Category → Save) |
| **Cognitive Load on Launch** | **Low & Contextual**: User immediately sees their financial health (balance, recent records) before acting. Clear situational awareness. | **High & Presumptive**: Assumes the user *only* opens the app to log a transaction right now, forcing a blank form upon launch. |
| **Mobile Usability** | **Excellent**: Bottom bar or thumb-friendly floating actions allow immediate single-tap entry. Dismissing the form returns to familiar home. | **Fair**: If the user opened the app just to check their balance or review yesterday's spend, they must cancel/bypass the form. |
| **Desktop Usability** | **Superior**: A wide desktop dashboard looks natural with metrics, transaction ledger, and a quick-entry button/shortcut. | **Poor**: An immediate full-screen entry form on a 27-inch desktop feels jarring and empty. |
| **Discoverability & Mental Model** | **Intuitive**: Standard mobile & web banking mental model. Users understand where their data goes after saving. | **Disorienting**: Users wonder "Where is my balance?", "Did my last transaction record?", "Where is the report?" |
| **Scalability (Future Roadmap)** | **High**: Readily accommodates future accounts, budgets, reports, and search without restructuring the landing experience. | **Low**: Difficult to scale without adding cumbersome tab switching or persistent back buttons. |
| **Fit with Product Goal** | **Best Fit**: Satisfies the under-5-second criterion comfortably while providing immediate financial orientation. | **Misfit**: Optimizes 1 tap at the cost of overall application clarity and balance checking. |

### 2.2 Recommendation & Decision
**Selected Pattern: Pattern A (Dashboard-First with Instant Action Triggers)**.
To eliminate the 1-tap penalty on mobile, Pattern A is enhanced with:
* Floating/Sticky bottom action bar on mobile (`+ Chi` in high-contrast rose/crimson, `+ Thu` in emerald).
* Direct autofocus on the amount input upon opening the entry sheet.
* 1-tap quick category selection chips.
* Global keyboard shortcut on desktop (`C` for Chi, `T` for Thu).

---

## 3. End-to-End User Interaction Flows

### 3.1 Dashboard Flow (Home Screen)
```
[ Open App ]
     │
     ├── 1. Read Top Metrics:
     │      ├─ Số dư hiện tại (Net Balance = Total Income - Total Expense)
     │      ├─ Tổng thu tháng này (Emerald)
     │      └─ Tổng chi tháng này (Rose)
     │
     ├── 2. Inspect Recent Transactions:
     │      └─ Displays latest 5 items (Category icon, Name/Note, Date, Amount)
     │
     └── 3. Primary Branching:
            ├─ Tap [+ Chi]  ──▶ Opens Add Expense Flow (Bottom Drawer / Modal)
            ├─ Tap [+ Thu]  ──▶ Opens Add Income Flow (Bottom Drawer / Modal)
            ├─ Tap [Xem tất cả] ──▶ Navigates to Transactions Ledger Flow
            └─ Tap [Báo cáo] ──▶ Navigates to Monthly Report Flow
```

---

### 3.2 Add Expense & Add Income Flows (The Core 4-Action Loop)

Both flows use the unified `TransactionEntryModal` (rendered as a **Bottom Sheet** on mobile and a **Centered Dialog** on desktop).

```
[ User taps + Chi or + Thu ]
     │
     ▼
[ Transaction Drawer Opens ]
     ├─ Type toggle pre-selected: [ Chi phí ] or [ Thu nhập ] (Can switch with 1 tap)
     ├─ Date defaulted to TODAY (e.g., "Hôm nay, 30/09/2026")
     │
     ├─ [ACTION 1]: Amount Input focused automatically
     │      └─ Numeric keypad opened (Mobile: inputMode="decimal")
     │      └─ Real-time formatted display (e.g. typing 3 5 0 0 0 -> displays "35.000 ₫")
     │
     ├─ [ACTION 2]: Category Grid Selection
     │      └─ Visual chips with clear icons & labels (Single-select)
     │      └─ Default popular categories visible immediately without scrolling
     │
     ├─ [OPTIONAL]: Notes Input (Collapsed or single-line placeholder "Ghi chú (tùy chọn)")
     │
     ├─ [OPTIONAL]: Custom Date (Tap date badge to pick past date if needed)
     │
     ▼
[ Tap "Lưu giao dịch" / Enter ]
     │
     ├─ Validation check:
     │      ├─ Amount > 0? (If 0 or empty -> Inline error: "Vui lòng nhập số tiền hợp lệ")
     │      └─ Category selected? (If none -> Inline error: "Vui lòng chọn danh mục")
     │
     ▼
[ Successful Save ]
     ├─ Drawer closes with smooth slide-down (150ms)
     ├─ Toast notification: "Đã lưu 35.000 ₫ vào Ăn uống"
     └─ Dashboard metrics & recent list update instantly (zero reload)
```

---

### 3.3 Transaction List & Search/Filter Flow

```
[ Enter Transactions View ]
     │
     ├── Sticky Header:
     │      ├─ Month selector (e.g., "Tháng 09/2026" with < Prev / Next >)
     │      ├─ Type filter: [ Tất cả | Chi phí | Thu nhập ]
     │      └─ Category filter dropdown
     │
     ├── Grouped Transaction List:
     │      └─ Grouped chronologically by Day:
     │            [ Hôm nay - 30/09/2026 ] ────────── Day Total: -85.000 ₫
     │               • Ăn uống | Cà phê sáng         -35.000 ₫
     │               • Đi lại  | Đổ xăng xe          -50.000 ₫
     │            [ Hôm qua - 29/09/2026 ] ────────── Day Total: +15.000.000 ₫
     │               • Lương   | Lương tháng 9   +15.000.000 ₫
     │
     └── User Item Action:
            └─ Tap row ──▶ Opens Transaction Detail / Edit Drawer
```

---

### 3.4 Transaction Edit & Delete Flow

```
[ Tap Transaction in List ]
     │
     ▼
[ Open Detail/Edit Drawer ]
     ├─ Pre-populated with current values: Type, Amount, Category, Date, Note
     │
     ├── Edit Flow:
     │      ├─ Modify amount, change category, or edit note
     │      ├─ Nếu thuộc tháng đã kết thúc: Hiển thị Modal Cảnh báo Tác động Dây chuyền (PDR-019 Confirmed)
     │      ├─ Nếu gắn với Quỹ đã ẩn: Giữ nguyên liên kết Quỹ ẩn, cho phép sửa số tiền/nội dung bình thường (PDR-020 Confirmed)
     │      └─ Tap [Cập nhật] ──▶ Validates ──▶ Persists update ──▶ Toast: "Đã cập nhật"
     │
     └── Delete Flow (Safeguarded):
            ├─ Tap [Xóa giao dịch] (Destructive red button)
            │
            ▼
       [ Confirmation Prompt / Sheet ]
            ├─ Dialog: "Bạn có chắc muốn xóa giao dịch này?"
            ├─ Details: "35.000 ₫ - Ăn uống (30/09/2026)"
            │
            ├── Tap [Hủy] ──▶ Dismisses confirmation, keeps transaction intact
            │
            └── Tap [Xác nhận xóa] ──▶
                   ├─ Removes transaction from store
                   ├─ Closes drawer
                   ├─ Updates list & dashboard totals immediately
                   └─ Toast: "Đã xóa giao dịch"
```

---

### 3.5 Simple Reports & Category Drill-Down Flow

The report is deliberately scoped to answer the 5 core financial questions:

```
[ Enter Reports View ]
     │
     ├── 1. Period Selector: [ < Tháng 09/2026 > ]
     │
     ├── 2. Core Question 1, 2, 3: Net Summary
     │      ┌──────────────────────┬──────────────────────┬──────────────────────┐
     │      │ Tổng thu: +20.000.000│ Tổng chi: -8.500.000 │ Còn lại: +11.500.000 │
     │      └──────────────────────┴──────────────────────┴──────────────────────┘
     │
     ├── 3. Core Question 4: "Where did my spending go?"
     │      └─ Category Spending Breakdown (Ordered by highest amount):
     │            1. Ăn uống        5.100.000 ₫ (60%)  ████████████▒▒▒▒
     │            2. Tiền nhà/Điện  2.000.000 ₫ (24%)  █████▒▒▒▒▒▒▒▒▒▒▒
     │            3. Đi lại           900.000 ₫ (11%)  ██▒▒▒▒▒▒▒▒▒▒▒▒▒▒
     │            4. Khác             500.000 ₫ ( 5%)  █▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
     │
     └── 4. Core Question 5: "What transactions make up a selected category?"
            │
            └─ User taps on "Ăn uống":
                   ▼
            [ Filtered Drill-Down Section Opens Below ]
                   ├─ Header: "Chi tiết Ăn uống (5.100.000 ₫ - 14 giao dịch)"
                   └─ Chronological list of transactions belonging exclusively
                      to "Ăn uống" within this month.
```

---

## 4. Edge Cases, Empty States & Error Handling

### 4.1 Empty States
| Screen | Trigger Condition | Display Strategy | User Call-to-Action |
|---|---|---|---|
| **Dashboard Recent** | No transactions recorded in app | Friendly icon, illustration badge, message: *"Chưa có giao dịch nào"* | Highlighted `[+ Ghi khoản chi đầu tiên]` button |
| **Transaction List** | No transactions match active filter/month | Filter icon, message: *"Không có giao dịch nào trong tháng này"* | `[+ Thêm giao dịch]` or `[Đặt lại bộ lọc]` |
| **Reports** | Zero income and zero expense in month | Minimal graphic, message: *"Chưa có dữ liệu chi tiêu tháng này"* | Quick prompt: *"Thêm giao dịch để xem phân tích"* |
| **Category Drilldown**| Category selected has 0 expenses | Message: *"Không có chi tiêu cho danh mục này"* | Return to summary list |

### 4.2 Form Validation Rules
* **Amount**:
  * Rule: Must be a positive number (`amount > 0`).
  * Edge cases: If user enters `0`, negative numbers, or non-numeric characters, submit is disabled or highlights input in red with text: *"Vui lòng nhập số tiền lớn hơn 0"*.
  * Sanitization: Strips non-digits; handles Vietnamese currency format (`.` as thousands separator).
* **Category**:
  * Rule: Must be explicitly selected.
  * Validation: If attempted to save without category, border glows warning red with prompt: *"Vui lòng chọn danh mục"*.
* **Date**:
  * Defaults to current client date. If user manually picks a date, validates valid ISO date string. Does not block future dates (useful for scheduled bill logging), but warns if date is > 1 year in advance.

### 4.3 Error States
* **Storage quota / Browser Storage Error**:
  * Handled gracefully via `try...catch` wrapper around storage adapter.
  * Displays persistent banner: *"Bộ nhớ trình duyệt gặp lỗi. Dữ liệu tạm thời chưa được lưu."*
* **Corrupted Record**:
  * Silently falls back to default empty state and logs non-blocking console warning rather than crashing the React tree.

---

## 5. Responsive Navigation Architecture

### 5.1 Mobile Navigation (< 768px) — (PDR-016 Confirmed)
* **Top App Bar**: App brand title ("Thu Chi"), Current Month pill.
* **Bottom Navigation Bar (Fixed 64px)**:
  * Tab 1: **Tổng quan** (Dashboard icon)
  * Tab 2: **Sổ giao dịch** (List icon)
  * Action Center (Trung tâm): Nút nổi Quick Action **+ Chi** / **+ Thu** (Vùng ngón tay cái tối ưu, bảo toàn tốc độ ghi chép < 5 giây)
  * Tab 3: **Quỹ** (Wallet icon — PDR-016)
  * Tab 4: **Báo cáo** (Chart icon)
* **Entry Surface**: Bottom Sheet sliding from screen bottom, occupying 75% height, thumb-reachable.

### 5.2 Desktop Navigation (>= 768px) — (PDR-016 Confirmed)
* **Top Header / Sidebar**: Compact top navigation or left slim sidebar.
  * App logo & title
  * Navigation links: `Tổng quan` | `Sổ giao dịch` | `Quản lý Quỹ` | `Báo cáo` | `Cài đặt`
  * Primary Action Button: `[+ Thêm giao dịch]` (Opens centered dialog with hotkeys `Esc` to close, `Enter` to save, `C` for Chi, `T` for Thu).
* **Grid Density**:
  * 3-column dashboard: Left 2 columns for Net Balance + Recent Transactions list; Right 1 column for Quick Category Spending snapshot & Quick Fund Budget Overview widget.

---

## 6. Functional Extension: Quản lý Quỹ (Fund Management)

Chi tiết toàn bộ kiến trúc tương tác, luồng người dùng (Flows A–E), wireflow và wireframe văn bản cho chức năng Quản lý Quỹ được tài liệu hóa chuyên sâu tại:
* **UX Flow Quỹ**: [UX_FLOW_FUND_MANAGEMENT.md](file:///d:/Coding_Design/Personal/QL_ThuChi/docs/UX_FLOW_FUND_MANAGEMENT.md)
* **Quy tắc UX Dùng chung**: [UX_RULES.md](file:///d:/Coding_Design/Personal/QL_ThuChi/docs/UX_RULES.md)
* **Wireframes & Blueprints**: [WIREFRAMES.md](file:///d:/Coding_Design/Personal/QL_ThuChi/docs/WIREFRAMES.md)
