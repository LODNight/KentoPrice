# Decisions Log (ADR & PDR)

This document tracks all Architecture Decision Records (ADR) and Product Decision Records (PDR) for the Personal Expense Tracker project.

---

## Record Index

| ID | Title | Status | Date |
|---|---|---|---|
| **ADR-001** | Strict MVP Feature Scope Boundaries | Accepted | 2026-09-30 |
| **ADR-002** | Local-First Storage Strategy with Repository Pattern | Accepted | 2026-09-30 |
| **ADR-003** | UI/UX Strategy Prioritizing Workspace Design Intelligence Skills | Accepted | 2026-09-30 |
| **ADR-004** | Pure Business Logic & Calculation Layer Decoupled from UI | Accepted | 2026-09-30 |
| **ADR-005** | Strict Mobile & Desktop Layout Parity Without Mere Viewport Scaling | Accepted | 2026-09-30 |
| **ADR-006** | IndexedDB as Primary Persistence Mechanism over LocalStorage | Accepted | 2026-09-30 |
| **ADR-007** | Strict Whole Integer VND & Local Calendar Date Representation | Accepted | 2026-09-30 |
| **PDR-008** | Khái niệm Quỹ & Quan hệ 0..1 với Giao dịch | Confirmed | 2026-10-09 |
| **PDR-009** | Giới hạn 10 Quỹ hoạt động & Cơ chế Ẩn/Khôi phục thay vì Xóa | Confirmed | 2026-10-09 |
| **PDR-010** | Hai chế độ ngân sách Quỹ: Cộng dồn (Rollover) và Đặt lại (Reset) | Confirmed | 2026-10-09 |
| **PDR-011** | Cho phép Budget = 0 ₫ và Số dư âm, không chặn giao dịch | Confirmed | 2026-10-09 |
| **PDR-012** | Chỉnh sửa Budget áp dụng ngay cho tháng hiện tại | Confirmed | 2026-10-09 |
| **PDR-013** | Bảo toàn Lịch sử Budget các tháng đã kết thúc | Confirmed | 2026-10-09 |
| **PDR-014** | Đổi Chế độ Ngân sách áp dụng tức thì & Bảo toàn Lịch sử | Confirmed | 2026-10-09 |
| **PDR-015** | Tên Quỹ duy nhất trong nhóm Quỹ đang hoạt động | Confirmed | 2026-10-09 |
| **PDR-016** | Mục Quỹ trong Điều hướng Chính (Navigation) | Confirmed | 2026-10-09 |
| **PDR-017** | Xử lý Đổi chế độ ngân sách nhiều lần trong cùng một tháng (Mô hình A) | Confirmed | 2026-10-09 |
| **PDR-018** | Kiến trúc lưu trữ cấu hình ngân sách Quỹ theo tháng (Normalized Store) | Confirmed | 2026-10-09 |
| **PDR-019** | Xử lý chỉnh sửa/chuyển ngày giao dịch thuộc tháng đã kết thúc | Confirmed | 2026-10-09 |
| **PDR-020** | Cho phép chỉnh sửa giao dịch gắn Quỹ đã ẩn mà không ép khôi phục | Confirmed | 2026-10-09 |
| **PDR-021** | Chính sách Khóa sổ kỳ ngân sách quá khứ (Closing Period Lock - Ngoài MVP) | Open | 2026-10-09 |
| **PDR-022** | Quy tắc chuyển số dư giữa các chu kỳ tháng (Target-Month Rules) | Confirmed | 2026-10-09 |
| **PDR-023** | Quản lý Danh mục Tùy chỉnh (Custom Category Management) | Confirmed | 2026-10-09 |

---

## ADR-001: Strict MVP Feature Scope Boundaries

* **Context**: Personal finance applications easily fall into the trap of feature bloat (multi-currency, cloud auth, recurring budgets, AI financial insights, investment tracking). Building these prematurely slows down shipping the core value: lightning-fast transaction logging.
* **Decision**: Confine MVP strictly to:
  * Transaction CRUD (Income & Expense)
  * Basic categories
  * Dashboard totals & recent transactions
  * Monthly report with category drill-down
  * Client-side persistent storage
* **Consequences**:
  * Positive: Delivers an ultra-fast, robust, distraction-free product in days.
  * Mitigation: Architecture uses decoupled services so cloud sync or multi-wallet can be added later without structural rewrites.

---

## ADR-002: Local-First Storage Strategy with Repository Pattern & Documented Limitations

* **Context**: The MVP must function reliably offline, have zero latency upon opening, and require no backend/server hosting to be immediately useful.
* **Decision**:
  * Use client-side persistence (`LocalStorage` / `IndexedDB`) encapsulated behind a clean TypeScript repository interface (`TransactionRepository`).
  * All transaction operations pass through this repository interface.
* **Known Limitations & Consequences**:
  * Positive: Instant app load, zero network dependencies, complete user privacy by default.
  * Negative / Vulnerabilities:
    - User clearing browser/site data or browsing in private/incognito mode will erase data.
    - Device failure or browser corruption results in unrecoverable data loss.
    - No multi-device synchronization in the MVP.
  * Mitigation: Design the repository pattern so a lightweight JSON Export/Import resilience tool and cloud sync can easily be added post-MVP.

---

## ADR-003: Calm, Minimal UI/UX Strategy Prioritizing Data Hierarchy

* **Context**: The user explicitly requested prioritizing UI skills (`ui-ux-pro-max`), while emphasizing that *Data hierarchy > usability > readability > decoration*. Glassmorphism should NOT be an all-encompassing decorative gimmick.
* **Decision**:
  * Adopt a calm, minimal, dark-first financial aesthetic (`#0F172A` background, solid low-distraction card surfaces `#192134`, subtle `rgba(255, 255, 255, 0.08)` borders).
  * Use glassmorphic backdrop-blur and elevation **selectively** (restricted to modals, bottom drawers, and active elevated states).
  * Strictly enforce WCAG 2.1 AA (4.5:1 text contrast) for all semantic colors (Emerald `#10B981` / `#059669` for Income, Rose `#EF4444` / `#DC2626` for Expense, Blue `#3B82F6` for Primary).
  * Enforce semantic SVG icons (Lucide / Heroicons style) and prohibit raw emojis as interface icons.
* **Consequences**:
  * Positive: Clear data hierarchy, zero visual clutter, distraction-free transaction entry in under 5 seconds.

---

## ADR-004: Pure Business Logic & Calculation Layer Decoupled from UI

* **Context**: Financial calculations (net balance, monthly income/expense totals, category percentage splits, currency formatting) embedded directly in React components become difficult to test and cause rendering bugs.
* **Decision**:
  * Extract all calculation logic into pure, stateless TypeScript utility functions (e.g., `calculateSummary()`, `groupExpensesByCategory()`, `formatCurrency()`).
  * Components only receive calculated views or call dedicated service helpers.
* **Consequences**:
  * Positive: Calculations can be 100% unit-tested independently without mocking DOM or UI components.
  * Positive: Prevents rounding or precision anomalies across multiple views.

---

## ADR-005: Strict Mobile & Desktop Layout Parity Without Mere Viewport Scaling

* **Context**: Mobile users record transactions on the go with one hand (thumb zone), whereas desktop users review monthly spending on wide monitors. Stretching a mobile layout across a wide screen looks sparse, while cramming a desktop dashboard into mobile creates clutter.
* **Decision**:
  * **Mobile (< 768px)**: Optimized bottom action bar/floating quick entry, bottom sheet drawer for transaction creation, stacked cards, full-width thumb-friendly buttons.
  * **Desktop (>= 768px)**: Multi-column dashboard grid, prominent KPI metrics row, side-by-side transaction log and category distribution visualization, modal dialog for quick entry with keyboard shortcuts.
* **Consequences**:
  * Positive: Delivers tailored, first-class usability on any device size.

---

## ADR-006: IndexedDB as Primary Persistence Mechanism over LocalStorage

* **Context**: Financial applications require reliability, non-blocking I/O, and structured transactional data. `localStorage` is synchronous, capped at ~5MB, stores only strings, and risk blocking UI thread during serializations.
* **Decision**:
  * Use `IndexedDB` (with a lightweight promise-based wrapper) as the primary storage mechanism.
  * Encapsulate behind `ITransactionRepository` and `ICategoryRepository` interfaces.
* **Consequences**:
  * Positive: Asynchronous I/O never blocks the main UI thread, transactional ACID safety protects against crash corruption, supports 50MB+ data with indexes on date and category.
  * Mitigation: In restricted environments (e.g. strict private mode in older browsers), a lightweight LocalStorage fallback can implement the exact same repository interface.

---

## ADR-007: Strict Whole Integer VND & Local Calendar Date Representation

* **Context**: Floating-point currency calculations cause rounding errors. UTC timezone conversions cause transactions logged late at night (e.g., 23:00 on the 31st) to flip to the 1st of the next month.
* **Decision**:
  * Store currency amounts as strict positive integers representing whole VND (`amount: 35000` for 35.000 ₫).
  * Formatting belongs exclusively to presentation/pure helpers (`formatVND()`).
  * `transactionDate` is stored as strict calendar date string `YYYY-MM-DD` representing local user calendar day, completely avoiding UTC timezone shift anomalies.
  * `createdAt` and `updatedAt` are stored as ISO 8601 UTC strings for audit logging.
* **Consequences**:
  * Positive: Zero float precision issues; reliable monthly grouping and reporting without timezone distortion.

---

## Ghi chú Tiến hóa Phạm vi (Scope Evolution Note: Milestone Quản lý Quỹ)

* **Bối cảnh lịch sử**: Trong giai đoạn thiết lập ban đầu (ADR-001, 2026-09-30), ứng dụng đặt mục tiêu tối thượng là tốc độ ghi nhận giao dịch dưới 5 giây và tạm gác lại tính năng đa ví / hạn mức ngân sách phức tạp.
* **Quyết định tiến hóa (2026-10-09)**: Nhằm đáp ứng nhu cầu kiểm soát chi tiêu có mục đích mà vẫn giữ vững triết lý tối giản, ứng dụng mở rộng tính năng **Quản lý Quỹ (Fund Management)** theo mô hình hũ ngân sách (envelope budgeting) nhẹ nhàng. Các quyết định PDR dưới đây được bổ sung có hệ thống, không xóa bỏ giá trị lịch sử của ADR-001.

---

## PDR-008: Khái niệm Quỹ & Quan hệ 0..1 với Giao dịch

* **Trạng thái**: Accepted (Đã xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Cần phân biệt rõ giữa phân loại giao dịch (Category) và ngân sách chịu trách nhiệm chi trả (Fund) để tránh làm rối mô hình dữ liệu.
* **Quyết định**:
  * `Mục` (Category): Phân loại bản chất khoản chi (Ăn uống, Tiền điện, Cà phê...).
  * `Quỹ` (Fund): Hạn mức/Khoản tiền chi trả (Quỹ Sinh hoạt, Quỹ Đãi tiệc, Quỹ Mua sắm...).
  * Quan hệ giữa Giao dịch và Quỹ là `0..1`: Một giao dịch có thể không thuộc Quỹ nào hoặc thuộc tối đa 1 Quỹ.
  * Không bắt buộc mọi giao dịch phải gắn với Quỹ.
* **Hệ quả & Tác động**:
  * Tránh ép buộc người dùng; duy trì tốc độ ghi chép nhanh dưới 5 giây đối với các giao dịch thông thường.
  * Bổ sung trường tùy chọn `fundId?: string` trong mô hình giao dịch.

---

## PDR-009: Giới hạn 10 Quỹ hoạt động & Cơ chế Ẩn/Khôi phục thay vì Xóa

* **Trạng thái**: Accepted (Đã xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Cần ngăn chặn tình trạng phình to danh mục gây rối mắt trên màn hình di động, đồng thời đảm bảo an toàn dữ liệu lịch sử.
* **Quyết định**:
  * Giới hạn tối đa **10 Quỹ đang hoạt động đồng thời** (`activeFunds.length <= 10`).
  * Tuyệt đối không hỗ trợ "Xóa vĩnh viễn" Quỹ trong UX thông thường. Thay vào đó sử dụng cơ chế **Ẩn Quỹ (`Archived`)**.
  * Quỹ đã ẩn giữ nguyên 100% lịch sử giao dịch và liên kết cũ; không xuất hiện trong danh sách chọn của giao dịch mới.
  * Cho phép khôi phục Quỹ đã ẩn nếu số Quỹ active hiện tại `< 10`. Nếu đã đủ 10, hiển thị hướng dẫn người dùng chủ động ẩn 1 Quỹ khác trước.
  * Tuyệt đối không tự động ẩn Quỹ khác hoặc tự chuyển giao dịch sang Quỹ khác.
* **Hệ quả & Tác động**:
  * Bảo vệ toàn vẹn lịch sử tài chính của người dùng.
  * Ngăn ngừa tai nạn mất dữ liệu.

---

## PDR-010: Hai chế độ ngân sách Quỹ: Cộng dồn (Rollover) và Đặt lại (Reset)

* **Trạng thái**: Accepted (Đã xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Người dùng có 2 nhóm nhu cầu quản lý: (1) Quỹ tích lũy/dự phòng dồn tiền qua các tháng; (2) Quỹ sinh hoạt định kỳ cần bắt đầu lại mỗi tháng.
* **Quyết định**:
  * Hỗ trợ 2 chế độ độc lập:
    * **Cộng dồn (`rollover`)**: Cấp hạn mức theo tháng; số dư dương hoặc số dư âm cuối tháng trước được chuyển toàn bộ sang tháng sau bù trừ.
    * **Đặt lại mỗi tháng (`reset`)**: Mỗi tháng bắt đầu lại với đúng Budget tháng đó; không chuyển số dư hay số nợ tháng trước sang.
* **Hệ quả & Tác động**:
  * Bao quát trọn vẹn cả nhu cầu tích lũy linh hoạt và chi tiêu cố định.
  * Công thức tính số dư phải được hiển thị minh bạch và trực quan trên giao diện.

---

## PDR-011: Cho phép Budget = 0 ₫ và Số dư âm, không chặn giao dịch

* **Trạng thái**: Accepted (Đã xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Quản lý tài chính cá nhân mang tính tự do; người dùng có thể tạo quỹ chưa cấp hạn mức hoặc có các đợt phát sinh ngoài dự kiến làm bội chi.
* **Quyết định**:
  * Cho phép thiết lập `monthlyBudget = 0 ₫`.
  * Cho phép số dư âm khi chi tiêu vượt hạn mức.
  * **Tuyệt đối không chặn ghi nhận giao dịch** khi Quỹ bị hết hạn mức hoặc âm tiền.
  * Giao diện hiển thị cảnh báo trực quan đa giác quan (icon `AlertTriangle`, màu Rose, nhãn text "Vượt ngân sách").
* **Hệ quả & Tác động**:
  * Đảm bảo tính trung thực của dữ liệu tài chính (không làm người dùng bỏ cuộc vì bị chặn ghi chi tiêu).
  * Tuân thủ triết lý Calm & Data-First.

---

## PDR-012: Chỉnh sửa Budget áp dụng ngay cho tháng hiện tại

* **Trạng thái**: Accepted (Đã xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Khi người dùng điều chỉnh Budget trong tháng, cần có quy tắc rõ ràng về việc số dư được cập nhật như thế nào.
* **Quyết định**:
  * Thay đổi Budget áp dụng ngay lập tức cho tháng hiện tại.
  * Khoản đã chi trong tháng không bị thay đổi chỉ vì người dùng sửa Budget.
  * Số dư được tính lại ngay lập tức dựa trên Budget mới.
  * Bắt buộc có **Live Preview** hiển thị tác động đến số dư trước khi người dùng nhấn Lưu.
* **Hệ quả & Tác động**:
  * Người dùng hiểu ngay con số thay đổi, loại bỏ hoàn toàn sự bất ngờ về số dư.

---

## PDR-013: Bảo toàn Lịch sử Cấu hình Budget các tháng đã kết thúc

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Khi người dùng thay đổi Budget ở tháng hiện tại, các tháng trong quá khứ có bị thay đổi Budget và số dư lịch sử hay không?
* **Quyết định đã chốt**:
  * **Cấu hình Budget của các tháng đã kết thúc phải được giữ nguyên vẹn (Historical Budget Immutability)**.
  * Budget mới chỉ áp dụng cho tháng hiện tại và các tháng tương lai.
  * **Tuyệt đối không hồi tố (retroactive)** Budget mới vào các tháng đã kết thúc.
  * Việc sửa Budget hiện tại không làm thay đổi cấu hình Budget lịch sử của những tháng đã kết thúc.
  * Số tiền đã chi trong tháng hiện tại không bị thay đổi chỉ vì Budget được chỉnh sửa.
* **Lưu ý phân biệt rạch ròi 3 tầng dữ liệu**:
  1. *Cấu hình lịch sử (Historical Config)*: Hạn mức Budget và Chế độ đã áp dụng trong tháng cũ $\rightarrow$ **BẤT BIẾN**.
  2. *Dữ liệu giao dịch (Transaction Data)*: Ngày, số tiền, danh mục, Quỹ $\rightarrow$ Người dùng có thể sửa đổi (trừ khi có khóa sổ cứng).
  3. *Số liệu dẫn xuất (Derived Metrics)*: Tổng chi tiêu, Số dư cuối tháng cũ, Số dư đầu kỳ tháng sau $\rightarrow$ **DẪN XUẤT ĐỘNG**; nếu giao dịch cũ bị sửa thì số liệu dẫn xuất tính lại theo cấu hình lịch sử của chính tháng đó (chi tiết tại PDR-019).
* **Yêu cầu UX & Giao diện**:
  * Phải phân biệt rõ ràng trên giao diện giữa:
    1. *Budget hiện tại*: Hạn mức áp dụng cho kỳ này.
    2. *Budget lịch sử*: Hạn mức từng được áp dụng tại các tháng đã qua.
    3. *Số dư tháng hiện tại*: Tính theo công thức kỳ này.
    4. *Số dư lịch sử đã kết thúc*: Giữ nguyên giá trị Closing Balance đã chốt (trừ khi có sửa đổi giao dịch lịch sử).

---

## PDR-014: Đổi Chế độ Ngân sách áp dụng tức thì & Bảo toàn Lịch sử

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Thời điểm áp dụng khi người dùng đổi từ `rollover` sang `reset` hoặc ngược lại, và cách bảo toàn dữ liệu quá khứ.
* **Quyết định đã chốt**:
  * **Chế độ mới áp dụng ngay trong tháng hiện tại** sau khi người dùng xác nhận qua Modal cảnh báo.
  * Giao diện bắt buộc cung cấp phần **Xem trước tác động (Impact Preview)** thể hiện rõ: Số dư hiện tại trước khi đổi vs Số dư dự kiến sau khi đổi.
  * **Các tháng đã kết thúc phải được bảo toàn** theo cấu hình chế độ và Budget lịch sử đã áp dụng trong từng tháng tương ứng.
  * Các giao dịch đã ghi nhận không bị sửa đổi chỉ vì người dùng đổi chế độ.
  * **Tuyệt đối không tính lại lịch sử** dựa trên chế độ hiện tại rồi ghi đè lên các kết quả cấu hình lịch sử đã kết thúc.
  * *Lưu ý về phạm vi*: PDR-014 xác nhận nguyên tắc "đổi có hiệu lực ngay trong tháng hiện tại và bảo toàn quá khứ". Cách thức tính toán số dư nội tại của tháng hiện tại khi đổi nhiều lần trong tháng được quy định chi tiết tại PDR-017 (`Confirmed` - Mô hình A).

---

## PDR-015: Tên Quỹ duy nhất trong nhóm Quỹ đang hoạt động

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Quy tắc đặt tên Quỹ để ngăn ngừa xung đột và nhầm lẫn khi người dùng gán Quỹ cho giao dịch.
* **Quyết định đã chốt**:
  * Tên Quỹ phải là **duy nhất** trong danh sách Quỹ đang hoạt động (`ACTIVE`).
  * Chuẩn hóa khi so sánh:
    * Loại bỏ khoảng trắng thừa ở đầu và cuối (trim).
    * Không phân biệt chữ hoa và chữ thường (case-insensitive).
    * Ví dụ: `Sinh hoạt`, `sinh hoạt` và `SINH HOẠT` được coi là cùng một tên và bị từ chối nếu đã tồn tại.
  * **Quỹ đã ẩn (`ARCHIVED`) có thể trùng tên** với Quỹ đang hoạt động.
  * **Khi khôi phục Quỹ đã ẩn**: Nếu tên bị trùng với một Quỹ đang hoạt động, hệ thống **bắt buộc yêu cầu người dùng đổi tên mới** trước khi hoàn tất khôi phục.
* **Yêu cầu UX**:
  * Hiển thị lỗi inline ngay tại trường Tên Quỹ với thông báo rõ ràng, dễ hiểu.
  * Giữ nguyên toàn bộ dữ liệu người dùng đã nhập trên form khi có lỗi trùng tên; không xóa sạch form.

---

## PDR-016: Mục Quỹ trong Điều hướng Chính (Navigation)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Vị trí hiển thị tính năng Quản lý Quỹ trên thanh điều hướng ứng dụng.
* **Quyết định đã chốt**:
  * Thêm mục **Quỹ** vào hệ thống điều hướng chính:
    * **Mobile (< 768px)**: Tích hợp vào Bottom Navigation (4 tabs: `Tổng quan`, `Sổ giao dịch`, `Quỹ`, `Báo cáo`), duy trì vị trí trung tâm ưu tiên ngón cái cho nút ghi nhanh `+ Chi` / `+ Thu`.
    * **Desktop (>= 768px)**: Tích hợp vào Top Navigation đồng cấp với `Tổng quan`, `Sổ giao dịch`, `Báo cáo`.
  * **Bảo vệ thao tác dưới 5 giây**: Việc thêm mục Quỹ vào navigation tuyệt đối không làm giảm khả năng tiếp cận thao tác ghi Thu/Chi nhanh. Người dùng không phải đi qua màn hình Quỹ khi chỉ muốn ghi giao dịch.

---

## PDR-017: Xử lý Đổi chế độ ngân sách nhiều lần trong cùng một tháng (Mô hình A / Calendar Month Level)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Khi người dùng thay đổi Budget hoặc Mode nhiều lần trong tháng hiện tại (ví dụ: Rollover ➔ Reset ➔ Rollover ➔ Sửa Budget ➔ Thêm giao dịch chi tiêu mới), cần xác định rõ quy tắc tính số dư để đảm bảo tính tất định và loại bỏ rủi ro cộng dồn sai lệch.
* **Quyết định đã chốt**:
  * Khi thay đổi Budget hoặc Mode trong tháng hiện tại, **số dư phải được tính lại từ dữ liệu nguồn theo cấu hình cuối cùng đang có hiệu lực** (Mô hình A — Calendar Month Level).
  * **Quy tắc tính toán**:
    * Nếu Mode hiện hành là `rollover`: `Opening Balance` lấy từ `Closing Balance` của tháng liền trước theo PDR-022.
    * Nếu Mode hiện hành là `reset`: `Opening Balance` bằng `0 ₫`.
    * `Current Balance` = `Opening Balance` + `Monthly Budget` − `Monthly Spending`.
  * **Các bất biến nghiệp vụ**:
    1. Thay đổi Budget không làm thay đổi các giao dịch đã ghi nhận.
    2. Thay đổi Mode không cộng dồn chênh lệch qua các lần thao tác trung gian trước đó.
    3. Chuỗi thay đổi `rollover → reset → rollover` phải cho kết quả cuối cùng hoàn toàn giống với việc tính toán trực tiếp với cấu hình cuối cùng là `rollover`.
    4. Các thao tác thay đổi Budget và Mode xen kẽ phải cho kết quả tất định (deterministic), độc lập hoàn toàn với lịch sử thao tác.
    5. **Không sửa cấu hình hoặc số liệu dẫn xuất của tháng đã kết thúc** chỉ vì người dùng thay đổi Budget/Mode của tháng hiện tại.
* **Phân biệt dữ liệu nguồn và số liệu dẫn xuất**:
  * *Dữ liệu nguồn (Source Data)*: Giao dịch gốc (`amount`, `date`, `fundId`), Cấu hình Budget/Mode hiện hành, Cấu hình lịch sử các tháng cũ.
  * *Số liệu dẫn xuất (Derived Metrics)*: `Opening Balance`, `Monthly Spending`, `Current Balance`, `Closing Balance`.
  * **Tuyệt đối không lưu số dư trung gian như dữ liệu gốc**.

---

## PDR-018: Kiến trúc lưu trữ cấu hình ngân sách Quỹ theo tháng (Normalized Separate Store)

* **Trạng thái**: Confirmed (ADR/PDR đã phê duyệt) | **Ngày**: 2026-10-09
* **Bối cảnh**: Để bảo toàn Budget và Chế độ của các tháng đã kết thúc theo PDR-013, PDR-014, PDR-019 và PDR-022, hệ thống cần một cơ chế lưu trữ bền vững cho các cấu hình theo từng chu kỳ tháng `YYYY-MM`.
* **Quyết định đã chọn**:
  * **Lựa chọn Phương án A: Normalized Object Store riêng biệt**.
  * Cấu trúc lưu trữ bao gồm 2 Object Store cho Quỹ trong IndexedDB Schema Version 2:
    1. `funds`: Lưu trữ thông tin định danh và thuộc tính cốt lõi của Quỹ (`id`, `name`, `icon`, `color`, `isArchived`, `order`, `defaultBudget`, `defaultMode`, `createdAt`, `updatedAt`).
    2. `fund_monthly_configs`: Lưu trữ cấu hình ngân sách theo từng chu kỳ tháng độc lập (`id: "${fundId}_${yearMonth}"`, `fundId`, `yearMonth`, `monthlyBudget`, `budgetMode`, `updatedAt`).
* **Lý do lựa chọn (Trade-off & Rationale)**:
  * **Tối ưu truy vấn & Hiệu năng**: Khi mở một tháng cụ thể, hệ thống chỉ cần đọc đúng bản ghi cấu hình của tháng đó qua composite key hoặc index `yearMonth`, không cần đọc toàn bộ lịch sử các tháng trước/sau.
  * **Chống phình to thực thể**: Thực thể `Fund` giữ kích thước cố định, không bị phình to sau 2-5 năm sử dụng với hàng chục bản ghi snapshot như Phương án B (Embedded Array).
  * **Cô lập ghi chép (Write Isolation)**: Hành động sửa Budget/Mode của tháng hiện tại chỉ tạo/cập nhật 1 bản ghi duy nhất trong `fund_monthly_configs`, hoàn toàn không chạm vào cấu hình của các tháng đã đóng ($\le M-1$).
* **Giải quyết trọn vẹn 5 yêu cầu dữ liệu tối thiểu**:
  1. *Truy xuất độc lập cấu hình từng tháng*: Query trực tiếp `fund_monthly_configs` theo key `${fundId}_${yearMonth}`. Nếu tháng đó chưa có cấu hình riêng, fallback mượt mà về `defaultBudget` / `defaultMode` của Quỹ.
  2. *Tính toán xác định số dư đầu kỳ và cuối kỳ*: Lưu trữ đầy đủ `(monthlyBudget, budgetMode)` của từng tháng; kết hợp với giao dịch gán `fundId` để tính toán tất định `Opening Balance` và `Closing Balance` theo PDR-017 & PDR-022.
  3. *Chống ghi đè cấu hình tháng đã kết thúc*: Các bản ghi trong `fund_monthly_configs` với `yearMonth < currentYearMonth` là bất biến đối với thao tác cấu hình thông thường.
  4. *Tính toán lại nhất quán khi giao dịch thay đổi*: Khi sửa giao dịch cũ, đọc cấu hình lịch sử của các tháng liên quan để chạy thuật toán Cascade Recalculation mà không làm thay đổi các bản ghi cấu hình.
  5. *Bảo toàn toàn vẹn liên kết Quỹ ẩn*: `fundId` trên `transactions` vẫn giữ nguyên vẹn giá trị khi Quỹ có `isArchived: true`. Không xóa bản ghi cấu hình lịch sử khi Quỹ bị ẩn.

---

## PDR-019: Sửa giao dịch lịch sử và tính lại dây chuyền (Cascade Recalculation)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Người dùng chỉnh sửa số tiền, xóa hoặc thay đổi ngày của một giao dịch thuộc tháng đã kết thúc trong quá khứ ($M-k$).
* **Quyết định đã chốt**:
  * **Cho phép người dùng sửa giao dịch thuộc tháng đã kết thúc**.
  * **Quy trình tính toán dây chuyền (Cascade)**:
    1. Giữ nguyên Budget và Mode lịch sử của các tháng bị ảnh hưởng.
    2. Tính lại `Monthly Spending` và `Closing Balance` của tháng có giao dịch thay đổi.
    3. Xác định phạm vi các tháng tiếp theo bị ảnh hưởng theo PDR-022.
    4. Nếu tháng đích dùng `rollover`, `Opening Balance` của tháng đó nhận `Closing Balance` đã cập nhật từ tháng trước.
    5. Nếu tháng đích dùng `reset`, `Opening Balance` của tháng đó bằng `0 ₫`; thay đổi số dư từ tháng trước **không được truyền qua ranh giới này**.
    6. Tiếp tục tính toán theo cùng quy tắc cho các tháng sau, cho đến khi không còn tháng bị ảnh hưởng.
    7. Không sửa giao dịch không liên quan hoặc ghi đè cấu hình lịch sử của bất kỳ tháng nào.
* **Phân định 3 tầng dữ liệu**:
  * *Dữ liệu giao dịch*: Có thể chỉnh sửa.
  * *Cấu hình lịch sử Budget/Mode*: Được bảo toàn bất biến.
  * *Opening Balance, Monthly Spending, Closing Balance*: Là số liệu dẫn xuất, được tính lại tự động.
* **Yêu cầu Cảnh báo UX bắt buộc**:
  * Trước khi lưu chỉnh sửa lịch sử có khả năng ảnh hưởng đến số dư các tháng khác, hệ thống bắt buộc hiển thị Modal cảnh báo rõ ràng (Wireframe 8 & 9).
  * Nội dung cảnh báo phải nêu rõ:
    * Giao dịch đang được sửa.
    * Tháng có giao dịch bị ảnh hưởng trực tiếp.
    * Các tháng tiếp theo có thể bị thay đổi số dư chuyển tiếp.
    * Số dư trước và sau thay đổi (nếu có thể xác định).
    * Cam kết việc sửa sẽ không thay đổi Budget/Mode lịch sử.
    * Nút hành động: `[Hủy bỏ]` hoặc `[Xác nhận cập nhật]`.
  * **Nguyên tắc hiển thị số liệu**: Không hiển thị số liệu giả định như kết quả đã tính chính xác; nếu chưa thể xác định đầy đủ tác động, phải nêu rõ giới hạn.

---

## PDR-020: Sửa giao dịch liên kết với Quỹ ẩn (Archived Fund Transactions)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Giao dịch cũ thuộc về một Quỹ hiện đang ở trạng thái `ARCHIVED`. Người dùng cần sửa số tiền, ghi chú, xóa hoặc chuyển Quỹ.
* **Quyết định đã chốt**:
  * **Người dùng được phép sửa giao dịch đã liên kết với Quỹ ẩn mà không cần khôi phục Quỹ trước**.
  * **Quy tắc chi tiết**:
    1. Việc ẩn Quỹ không xóa hoặc làm đứt liên kết `fundId` trên giao dịch cũ.
    2. Tuyệt đối không tự động đổi `fundId` thành `null` khi Quỹ được ẩn.
    3. Giao dịch lịch sử vẫn hiển thị tên/thông tin Quỹ đã liên kết kèm nhãn `(Đã ẩn)`.
    4. Việc sửa giao dịch **không được tự động khôi phục Quỹ**.
    5. Quỹ ẩn tuyệt đối không xuất hiện như một lựa chọn Quỹ mới khi ghi nhận giao dịch mới.
    6. Khi sửa giao dịch cũ, nếu người dùng không thay đổi Quỹ liên kết thì **giữ nguyên liên kết hiện có**.
    7. Nếu người dùng muốn chuyển giao dịch sang một Quỹ khác: **Chỉ cho phép lựa chọn từ danh sách Quỹ đang Active**.
  * Tuyệt đối không tự thêm quy tắc bắt buộc khôi phục Quỹ ẩn.

---

## PDR-021: Chính sách Khóa sổ Kỳ ngân sách Quá khứ (Closing Period Lock — Ngoài phạm vi MVP)

* **Trạng thái**: Open (Ghi nhận định hướng — Chưa thuộc phạm vi MVP) | **Ngày**: 2026-10-09
* **Bối cảnh**: Xem xét tính năng khóa sổ cứng để ngăn chặn việc sửa giao dịch ở các tháng đã đóng sổ.
* **Định hướng từ PO**:
  * **PO chưa đưa tính năng khóa sổ vào phạm vi triển khai MVP**.
  * **Không thêm tính năng khóa sổ bắt buộc vào MVP**.
  * **Không yêu cầu người dùng mở khóa sổ để thực hiện luồng sửa giao dịch lịch sử** đã được xác nhận tại PDR-019.
  * Vấn đề này được ghi nhận để xem xét trong tương lai (Post-MVP roadmap). Giữ trạng thái `Open`, không tự chuyển thành `Confirmed` hay tự mở rộng phạm vi MVP.

---

## PDR-022: Quy tắc chuyển số dư giữa các chu kỳ tháng (Target-Month Rules)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Quy tắc xác định số dư đầu kỳ khi chuyển tiếp giữa hai tháng liên tiếp ($M \rightarrow M+1$).
* **Quyết định đã chốt**:
  * **Chế độ của tháng đích ($M+1$) quyết định Opening Balance của chính tháng đó (Target-Month Rules)**:

| Mode tháng M+1 | Opening Balance tháng M+1 |
|---|---|
| `rollover` | `Closing Balance` tháng M |
| `reset` | `0 ₫` |

  * **Tính đối xứng tuyệt đối**: Quy tắc áp dụng hoàn toàn đối xứng cho số dư dương ($> 0$), bằng 0 ($= 0$) và số dư âm ($< 0$).
  * **Bốn hệ quả nghiệp vụ**:
    1. `rollover → rollover`: Kế thừa số dư cuối kỳ tháng trước, bao gồm cả thặng dư và bội chi.
    2. `rollover → reset`: Tháng đích bắt đầu từ `0 ₫`.
    3. `reset → rollover`: **Tháng đích vẫn nhận Closing Balance của tháng trước!**
    4. `reset → reset`: Tháng đích bắt đầu từ `0 ₫`.
  * **Nguyên tắc giải thích cốt lõi**:
    > **Không diễn giải Reset là xóa vĩnh viễn Closing Balance của tháng đó.**
    > Reset chỉ quy định `Opening Balance` của chính tháng Reset đó bằng `0 ₫`. Nếu tháng kế tiếp dùng Rollover, tháng kế tiếp vẫn nhận `Closing Balance` của tháng Reset theo đúng công thức $\text{Closing Balance}_M = \text{Budget}_M - \text{Spending}_M$.

---

## PDR-023: Quản lý Danh mục Tùy chỉnh (Custom Category Management)

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-09
* **Bối cảnh**: Người dùng cần thêm, sửa, ẩn danh mục thu chi linh hoạt theo nhu cầu cá nhân hóa nhưng phải đảm bảo tính toàn vẹn của lịch sử giao dịch và báo cáo tài chính.
* **Quyết định đã chốt**:
  1. **Tính bất biến phân loại (Type Immutability)**:
     * Không cho phép đổi loại (`expense` $\leftrightarrow$ `income`) của danh mục nếu đã có ít nhất 1 giao dịch tham chiếu đến danh mục đó.
  2. **Tên danh mục duy nhất theo Loại (Scoped Uniqueness)**:
     * Tên danh mục là duy nhất trong nhóm cùng loại (`expense` hoặc `income`) sau khi chuẩn hóa (trim và lowercase).
     * Cho phép trùng tên giữa 2 loại khác nhau (ví dụ: Danh mục Chi "Khác" và Danh mục Thu "Khác").
  3. **Ẩn (Soft-archive) vs Xóa vĩnh viễn (Hard-delete)**:
     * Danh mục **đã có giao dịch tham chiếu**: Chỉ cho phép **Ẩn (Archive)** và **Khôi phục (Restore)**. Khi bị ẩn, danh mục không xuất hiện trong picker thêm giao dịch mới, nhưng các giao dịch cũ vẫn giữ nguyên hiển thị tên và icon danh mục.
     * Danh mục **chưa từng có giao dịch nào tham chiếu**: Cho phép **Xóa vĩnh viễn (Hard-delete)** hoặc Ẩn.
     * Danh mục mặc định hệ thống (`isDefault: true`): Cho phép sửa tên, icon, màu sắc hoặc ẩn; không cho phép xóa vĩnh viễn.
  4. **Điểm truy cập tiện dụng (Dual Entry Points)**:
     * Điểm truy cập quản lý chuyên sâu trong `SettingsView`.
     * Nút thêm danh mục nhanh trực tiếp trong bộ chọn danh mục của `TransactionEntryModal` để người dùng không bị gián đoạn mạch ghi chép.

---

## PDR-024: Tự Động Đồng Bộ Ngầm (Auto Background Sync) & Vercel Deployment

* **Trạng thái**: Confirmed (PO xác nhận) | **Ngày**: 2026-10-14
* **Bối cảnh**: Người dùng muốn dữ liệu thu chi cá nhân được lưu trữ bền vững trên đám mây (Google Sheets) mà không phải bấm nút "Đẩy ngay" thủ công mỗi lần ghi chép, đồng thời triển khai web app lên Vercel để truy cập đa thiết bị.
* **Quyết định đã chốt**:
  1. **Triết lý Local-First & Non-Blocking**:
     * Mọi thao tác thêm/sửa/xóa giao dịch, quỹ, danh mục đều được ghi vào IndexedDB lập tức để đảm bảo trải nghiệm nhập liệu dưới 5 giây không có độ trễ.
     * Tự động kích hoạt cơ chế đồng bộ ngầm với thời gian debounce 3 giây (`debounceMs = 3000`) qua `AutoSyncManager`.
  2. **Trạng thái phản hồi trực quan (Header Status Pill)**:
     * Thanh Header hiển thị trạng thái đồng bộ: `Đang đồng bộ...` (xoay nhẹ) $\rightarrow$ `✓ Đã lưu Cloud` (xanh ngọc, tự ẩn sau 4 giây) hoặc `Lỗi Cloud` (nếu mất mạng).
  3. **Kiểm soát linh hoạt (User Control)**:
     * Cung cấp nút gạt bật/tắt Auto Sync ngay trong màn hình Cài đặt Đồng bộ Google Sheets.
     * Mặc định ẩn toàn bộ thông tin nhạy cảm (Web App URL, Secret Token) dưới dạng collapsible để giao diện gọn gàng, tinh tế.
  4. **Kiến trúc Triển khai Vercel**:
     * Cung cấp `vercel.json` định tuyến SPA rewrites (`/(.*) -> /index.html`) và cache assets bất biến.
     * Hỗ trợ nạp cấu hình tự động qua biến môi trường `VITE_GAS_WEBAPP_URL` và `VITE_GAS_TOKEN` để deploy một lần là dùng ngay.





