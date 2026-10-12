# Data Contract & Integrity Specification: Personal Expense Tracker

## 1. Scope & Purpose

Tài liệu này xác lập hợp đồng dữ liệu kỹ thuật (Data Contract), định dạng tuần tự hóa (Serialization Format), cơ chế quản lý phiên bản cơ sở dữ liệu (IndexedDB Schema Versioning), ma trận kiểm tra tính hợp lệ (Validation Matrices), phân tầng xử lý lỗi (Error Handling Hierarchy) và các quy tắc toàn vẹn dữ liệu cho tầng lưu trữ của ứng dụng Quản lý Thu Chi (KentoPrice).

Tài liệu là kim chỉ nam tối thượng để lập trình viên xây dựng và bảo trì tầng dữ liệu (Data & Repository Layer) mà không phải suy đoán hoặc thỏa hiệp nghiệp vụ.

---

## 2. Storage Schema & Persisted Representation (IndexedDB Schema Version 2)

### 2.1 Storage Namespace & Versioning

* **Tên Database IndexedDB**: `ql_thuchi_db`
* **Phiên bản Schema hiện hành (Active)**: `2`
* **Danh sách Object Stores**:

| Object Store | Key Path | Secondary Indexes | Mục đích |
|---|---|---|---|
| `transactions` | `id` | `transactionDate`, `categoryId`, `type`, `fundId` | Lưu trữ mọi giao dịch thu và chi thực tế |
| `categories` | `id` | `type`, `isArchived` | Lưu trữ danh mục phân loại thu/chi |
| `metadata` | `key` | *(none)* | Thông số kỹ thuật hệ thống (`schemaVersion`, `installedAt`, `upgradedToV2At`) |
| `funds` | `id` | `isArchived`, `order` | Lưu trữ danh mục Quỹ ngân sách (PDR-008, PDR-009) |
| `fund_monthly_configs` | `id` | `fundId`, `yearMonth` | Lưu cấu hình hạn mức & chế độ từng tháng độc lập (PDR-018) |

---

### 2.2 Serialized JSON Schemas (Persisted Objects)

#### 2.2.1 Serialized Transaction Object (`transactions` Store)

```json
{
  "id": "txn_a1b2c3d4",
  "type": "expense",
  "amount": 35000,
  "categoryId": "cat_coffee",
  "transactionDate": "2026-10-10",
  "note": "Cà phê sáng",
  "fundId": "fund_life_01",
  "createdAt": "2026-10-10T02:30:00.000Z",
  "updatedAt": "2026-10-10T02:30:00.000Z"
}
```

*Lưu ý*: Trường `fundId` có thể là `null` hoặc `undefined` nếu là khoản chi tự do ngoài ngân sách Quỹ (PDR-008).

#### 2.2.2 Serialized Category Object (`categories` Store)

```json
{
  "id": "cat_food",
  "name": "Ăn uống",
  "type": "expense",
  "icon": "Utensils",
  "color": "#F59E0B",
  "isDefault": true,
  "isArchived": false,
  "order": 1,
  "createdAt": "2026-09-01T00:00:00.000Z"
}
```

#### 2.2.3 Serialized Fund Object (`funds` Store)

```json
{
  "id": "fund_life_01",
  "name": "Quỹ Sinh Hoạt",
  "icon": "Wallet",
  "color": "#3B82F6",
  "isArchived": false,
  "order": 0,
  "defaultBudget": 5000000,
  "defaultMode": "rollover",
  "createdAt": "2026-10-09T08:00:00.000Z",
  "updatedAt": "2026-10-09T08:00:00.000Z"
}
```

#### 2.2.4 Serialized Fund Monthly Config Object (`fund_monthly_configs` Store)

```json
{
  "id": "fund_life_01_2026-10",
  "fundId": "fund_life_01",
  "yearMonth": "2026-10",
  "monthlyBudget": 5000000,
  "budgetMode": "rollover",
  "updatedAt": "2026-10-09T08:00:00.000Z"
}
```

---

## 3. Serialization Contracts: Date, Time, Currency & Identifiers

### 3.1 Date & Time Contract

| Khái niệm | Kiểu dữ liệu lưu trữ | Định dạng chuẩn | Xử lý múi giờ & Hành vi hệ thống |
|---|---|---|---|
| **Ngày giao dịch** (`transactionDate`) | Chuỗi String | `YYYY-MM-DD` | **Local Calendar Day**. Đại diện cho ngày lịch thực tế theo múi giờ thiết bị người dùng. **Tuyệt đối không đổi sang UTC hay lưu timestamp epoch**, ngăn ngừa hoàn toàn lỗi giao dịch ghi lúc 23:30 bị nhảy sang ngày hôm sau. |
| **Chu kỳ tháng** (`yearMonth`) | Chuỗi String | `YYYY-MM` | Đại diện cho chu kỳ tháng dương lịch (ví dụ `"2026-10"`). Khớp regex `^\d{4}-(0[1-9]\|1[0-2])$`. |
| **Thời gian tạo bản ghi** (`createdAt`) | Chuỗi String | ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) | Sinh ra qua `new Date().toISOString()`. Dấu thời gian kiểm toán bất biến. |
| **Thời gian cập nhật** (`updatedAt`) | Chuỗi String | ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) | Cập nhật qua `new Date().toISOString()` mỗi khi sửa bản ghi. Invariant: `updatedAt >= createdAt`. |

### 3.2 Currency Contract

* **Đơn vị lưu trữ**: Số nguyên dương (`amount > 0` cho giao dịch) hoặc số nguyên không âm (`budget >= 0` cho hạn mức ngân sách), đơn vị Đồng Việt Nam (`VND`).
* **Chữ số thập phân**: Tuyệt đối bằng `0` (VND không có đơn vị phụ hào/xu).
* **Bất biến số tiền giao dịch**:
  $$\text{amount} \in \mathbb{Z}^+, \quad 1 \le \text{amount} \le 1.000.000.000.000 \text{ VND}$$
* **Bất biến hạn mức ngân sách**:
  $$\text{budget} \in \mathbb{Z}^*, \quad 0 \le \text{budget} \le 1.000.000.000.000 \text{ VND}$$
* **Số dư dẫn xuất (Derived Balance)**:
  Có thể nhận giá trị âm khi chi tiêu vượt hạn mức (`currentBalance < 0`), lưu hành dưới dạng số nguyên có dấu (ví dụ `-350000` đại diện cho `-350.000 ₫`).
* **Nghiêm cấm trong tầng lưu trữ**:
  - Không lưu chuỗi đã định dạng (ví dụ `"35.000 ₫"`, `"35k"`).
  - Không lưu số thực dấu phẩy động (ví dụ `35000.5`).
  - Không lưu số âm cho `Transaction.amount` (chiều thu/chi được quy định bởi `type: 'expense' | 'income'`).
  - Không lưu số 0 cho `Transaction.amount` (giao dịch 0 đồng bị từ chối).

### 3.3 Identifier (Mã định danh) Contract

| Thực thể | Tiền tố chuẩn | Cú pháp sinh mã | Ví dụ mẫu |
|---|---|---|---|
| **Transaction** | `txn_` | `txn_` + UUID v4 hoặc 21-char nanoid ngẫu nhiên | `"txn_9f8b2c41a7"` |
| **Category** | `cat_` | `cat_` + slug (cho mặc định) hoặc UUID v4 | `"cat_food"`, `"cat_c8d1e2f3"` |
| **Fund** | `fund_` | `fund_` + slug hoặc UUID v4 | `"fund_life_01"`, `"fund_sho_92a"` |
| **FundMonthlyConfig** | *(Composite)* | Bắt buộc khớp chính xác cú pháp: `${fundId}_${yearMonth}` | `"fund_life_01_2026-10"` |
| **Metadata** | *(Static Key)* | Chuỗi khóa định danh tĩnh | `"schemaVersion"`, `"installedAt"` |

---

## 4. Data Validation Rules & Matrices

Mọi dữ liệu trước khi ghi vào IndexedDB qua repository đều bắt buộc phải vượt qua ma trận kiểm định domain invariants.

### 4.1 Transaction Validation Matrix

| Trường | Điều kiện hợp lệ (Predicate) | Mã lỗi (Error Code) | Thông báo lỗi (VI) |
|---|---|---|---|
| `id` | `typeof id === 'string' && id.trim().length > 0` | `ERR_INVALID_ID` | Mã giao dịch (id) không hợp lệ |
| `type` | `type === 'expense' \|\| type === 'income'` | `ERR_INVALID_TYPE` | Loại giao dịch phải là "expense" hoặc "income" |
| `amount` | `Number.isInteger(amount) && amount > 0 && amount <= 1e12` | `ERR_INVALID_AMOUNT` | Số tiền phải là số nguyên dương lớn hơn 0 và không vượt quá 1.000 tỷ VND |
| `categoryId` | `typeof categoryId === 'string' && categoryId.trim().length > 0` | `ERR_INVALID_CATEGORY` | Danh mục giao dịch không được để trống |
| *(Cross-check)* | `category !== null && category.type === transaction.type` | `ERR_CATEGORY_TYPE_MISMATCH` | Giao dịch và danh mục không cùng loại Thu/Chi |
| `transactionDate` | `/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))` | `ERR_INVALID_DATE` | Ngày giao dịch phải theo định dạng YYYY-MM-DD hợp lệ |
| `note` | `note === undefined \|\| (typeof note === 'string' && note.length <= 200)` | `ERR_NOTE_TOO_LONG` | Ghi chú không được vượt quá 200 ký tự |
| `fundId` | `fundId === undefined \|\| fundId === null \|\| (typeof fundId === 'string' && fundId.trim().length > 0)` | `ERR_INVALID_FUND_ID` | Mã Quỹ (fundId) không hợp lệ |
| `createdAt` | `!isNaN(Date.parse(createdAt))` | `ERR_INVALID_TIMESTAMP` | Thời gian tạo (createdAt) không hợp lệ |
| `updatedAt` | `!isNaN(Date.parse(updatedAt))` | `ERR_INVALID_TIMESTAMP` | Thời gian cập nhật (updatedAt) không hợp lệ |

### 4.2 Category Validation Matrix

| Trường | Điều kiện hợp lệ (Predicate) | Mã lỗi (Error Code) | Thông báo lỗi (VI) |
|---|---|---|---|
| `id` | `typeof id === 'string' && id.trim().length > 0` | `ERR_INVALID_ID` | Mã danh mục (id) không hợp lệ |
| `name` | `typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 50` | `ERR_INVALID_NAME` | Tên danh mục không được để trống và tối đa 50 ký tự |
| *(Uniqueness)* | `!allCategories.some(c => c.id !== id && c.type === type && !c.isArchived && c.name.trim().toLowerCase() === name.trim().toLowerCase())` | `ERR_DUPLICATE_CATEGORY_NAME` | Tên danh mục đã tồn tại trong cùng nhóm Thu/Chi |
| `type` | `type === 'expense' \|\| type === 'income'` | `ERR_INVALID_TYPE` | Loại danh mục phải là "expense" hoặc "income" |
| *(Type Immutability)*| Nếu đổi `type`: `countReferencingTransactions(id) === 0` | `ERR_CATEGORY_TYPE_IMMUTABLE` | Không thể đổi loại danh mục khi đã có giao dịch sử dụng danh mục này |
| `icon` | `typeof icon === 'string' && icon.trim().length > 0` | `ERR_INVALID_ICON` | Biểu tượng danh mục không hợp lệ |
| `color` | `typeof color === 'string' && /^#([0-9A-Fa-f]{3}\|[0-9A-Fa-f]{6})$/.test(color)` | `ERR_INVALID_COLOR` | Màu sắc danh mục không hợp lệ |
| `order` | `Number.isInteger(order) && order >= 0` | `ERR_INVALID_ORDER` | Thứ tự hiển thị phải là số nguyên không âm |

### 4.3 Fund Validation Matrix

| Trường | Điều kiện hợp lệ (Predicate) | Mã lỗi (Error Code) | Thông báo lỗi (VI) |
|---|---|---|---|
| `id` | `typeof id === 'string' && id.trim().length > 0` | `ERR_INVALID_ID` | Mã Quỹ (id) không hợp lệ |
| `name` | `typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 50` | `ERR_INVALID_NAME` | Tên Quỹ không được để trống và tối đa 50 ký tự |
| *(Uniqueness)* | `!activeFunds.some(f => f.id !== id && !f.isArchived && f.name.trim().toLowerCase() === name.trim().toLowerCase())` | `ERR_DUPLICATE_FUND_NAME` | Tên Quỹ đã tồn tại trong danh sách Quỹ đang hoạt động |
| *(Capacity)* | `isArchived || activeFunds.filter(f => !f.isArchived && f.id !== id).length < 10` | `ERR_FUND_CAPACITY_EXCEEDED` | Đã đạt giới hạn tối đa 10 Quỹ đang hoạt động. Vui lòng ẩn bớt Quỹ không dùng |
| `icon` | `typeof icon === 'string' && icon.trim().length > 0` | `ERR_INVALID_ICON` | Biểu tượng Quỹ không hợp lệ |
| `color` | `typeof color === 'string' && color.trim().length > 0` | `ERR_INVALID_COLOR` | Màu sắc Quỹ không hợp lệ |
| `isArchived` | `typeof isArchived === 'boolean'` | `ERR_INVALID_STATUS` | Trạng thái lưu trữ (isArchived) không hợp lệ |
| `order` | `Number.isInteger(order) && order >= 0` | `ERR_INVALID_ORDER` | Thứ tự hiển thị (order) phải là số nguyên không âm |
| `defaultBudget` | `Number.isInteger(defaultBudget) && defaultBudget >= 0 && defaultBudget <= 1e12` | `ERR_INVALID_BUDGET` | Hạn mức mặc định phải là số nguyên không âm (>= 0) |
| `defaultMode` | `defaultMode === 'rollover' \|\| defaultMode === 'reset'` | `ERR_INVALID_BUDGET_MODE` | Chế độ ngân sách mặc định phải là "rollover" hoặc "reset" |

### 4.4 FundMonthlyConfig Validation Matrix

| Trường | Điều kiện hợp lệ (Predicate) | Mã lỗi (Error Code) | Thông báo lỗi (VI) |
|---|---|---|---|
| `id` | `id === `${fundId}_${yearMonth}`` | `ERR_INVALID_ID` | Mã cấu hình phải khớp cú pháp ${fundId}_${yearMonth} |
| `fundId` | `typeof fundId === 'string' && fundId.trim().length > 0` | `ERR_INVALID_FUND_ID` | Mã Quỹ (fundId) không hợp lệ |
| `yearMonth` | `/^\d{4}-(0[1-9]\|1[0-2])$/.test(yearMonth)` | `ERR_INVALID_YEAR_MONTH` | Tháng cấu hình (yearMonth) phải có định dạng YYYY-MM hợp lệ |
| `monthlyBudget` | `Number.isInteger(monthlyBudget) && monthlyBudget >= 0 && monthlyBudget <= 1e12` | `ERR_INVALID_BUDGET` | Hạn mức ngân sách tháng phải là số nguyên không âm (>= 0) |
| `budgetMode` | `budgetMode === 'rollover' \|\| budgetMode === 'reset'` | `ERR_INVALID_BUDGET_MODE` | Chế độ ngân sách phải là "rollover" hoặc "reset" |

---

## 5. Data Integrity, Error Handling & Edge Case Policies

### 5.1 Phân cấp Xử lý Lỗi (Error Handling Hierarchy)

Hệ thống tuân thủ mô hình phân tầng Exception rõ ràng:

```
Error (Native JS)
  ├── DomainError
  │     ├── ValidationError (Chứa field?: string và thông báo tiếng Việt)
  │     └── CategoryTypeMismatchError (Lệch loại giao dịch và danh mục)
  └── StorageUnavailableError (Lỗi IndexedDB bị chặn/hỏng)
```

### 5.2 Bảng Tra Cứu Toàn Diện Mã Lỗi (Standard Error Codes)

| Mã lỗi | Nhóm | Mức độ | Hành vi xử lý giao diện (UI Behavior) |
|---|---|---|---|
| `ERR_INVALID_ID` | Validation | Chặn | Báo lỗi hệ thống, không thực hiện ghi |
| `ERR_INVALID_TYPE` | Validation | Chặn | Hiển thị lỗi form tại trường Loại giao dịch/danh mục |
| `ERR_INVALID_AMOUNT` | Validation | Chặn | Hiển thị lỗi inline dưới ô nhập số tiền; disable nút Lưu |
| `ERR_INVALID_CATEGORY` | Validation | Chặn | Yêu cầu người dùng chọn một danh mục |
| `ERR_CATEGORY_TYPE_MISMATCH` | Integrity | Chặn | Thông báo lỗi không khớp loại Thu/Chi |
| `ERR_INVALID_DATE` | Validation | Chặn | Đưa picker ngày về ngày hôm nay hợp lệ |
| `ERR_NOTE_TOO_LONG` | Validation | Chặn | Hiển thị bộ đếm ký tự màu đỏ; chặn bấm Lưu khi > 200 ký tự |
| `ERR_INVALID_FUND_ID` | Validation | Chặn | Báo lỗi mã Quỹ không tồn tại |
| `ERR_FUND_CAPACITY_EXCEEDED` | Business Rule | Chặn | Modal hướng dẫn: "Đã đạt tối đa 10 Quỹ. Ẩn bớt 1 Quỹ để tiếp tục" |
| `ERR_DUPLICATE_FUND_NAME` | Business Rule | Chặn | Lỗi inline tại ô Tên Quỹ: "Tên Quỹ đã tồn tại"; giữ nguyên form |
| `ERR_DUPLICATE_CATEGORY_NAME` | Business Rule | Chặn | Lỗi inline tại ô Tên Danh mục trong nhóm |
| `ERR_CATEGORY_TYPE_IMMUTABLE` | Business Rule | Chặn | Modal giải thích: Đã có giao dịch sử dụng, yêu cầu Ẩn thay vì đổi loại |
| `ERR_CATEGORY_IN_USE` | Business Rule | Chặn | Từ chối xóa vĩnh viễn; chuyển hướng sang gợi ý Ẩn danh mục |
| `ERR_INVALID_BUDGET` | Validation | Chặn | Báo lỗi số tiền ngân sách phải $\ge 0$ |
| `ERR_INVALID_BUDGET_MODE` | Validation | Chặn | Báo lỗi chế độ phải là rollover hoặc reset |
| `ERR_INVALID_YEAR_MONTH` | Validation | Chặn | Báo lỗi định dạng chu kỳ tháng YYYY-MM |
| `ERR_STORAGE_UNAVAILABLE` | Infrastructure | Chặn toàn cục | Banner cảnh báo IndexedDB bị khóa/chặn; hướng dẫn mở tab mới |
| `ERR_CORRUPT_RECORD` | Infrastructure | Cách ly | Cách ly bản ghi hỏng vào Quarantine Log; tải các bản ghi lành mạnh |

---

### 5.3 Phân định Lỗi Chặn (Blocking) vs Cảnh Báo Không Chặn (Non-Blocking)

| Tình huống nghiệp vụ | Loại | Cơ chế xử lý |
|---|---|---|
| Dữ liệu sai schema, thiếu trường, số tiền $\le 0$, trùng tên, quá 10 Quỹ | **Lỗi chặn (Blocking Error)** | Ném `ValidationError`, chặn hoàn toàn thao tác ghi vào IndexedDB. Giữ nguyên trạng thái form người dùng đã nhập. |
| Chi tiêu vượt hạn mức (`currentBalance < 0`) | **Cảnh báo không chặn (Non-blocking Warning)** | **Tuyệt đối không chặn ghi giao dịch** (PDR-011). Lưu giao dịch bình thường, tính toán `isOverBudget: true` và hiển thị cảnh báo màu Rose (`AlertTriangle`). |
| Thiết lập Budget = 0 ₫ | **Hợp lệ (Valid State)** | Chấp nhận bình thường (PDR-011). Mọi khoản chi phát sinh sẽ kích hoạt cảnh báo bội chi tương ứng. |

---

### 5.4 Chính Sách Quỹ Đã Ẩn & Sửa Giao Dịch Lịch Sử

1. **Giao dịch liên kết với Quỹ ẩn (PDR-020)**:
   - Khi Quỹ chuyển `isArchived: true`, trường `fundId` trên toàn bộ giao dịch cũ **giữ nguyên 100%**.
   - Người dùng được phép sửa số tiền, ngày, danh mục, ghi chú của giao dịch cũ mà **không cần khôi phục Quỹ trước**.
   - Việc sửa giao dịch cũ không tự động khôi phục Quỹ.
   - Nếu người dùng muốn đổi Quỹ, chỉ được phép chọn các Quỹ đang Active.
2. **Sửa giao dịch ở tháng đã kết thúc & Cascade Recalculation (PDR-019)**:
   - Cho phép người dùng chỉnh sửa giao dịch thuộc tháng cũ trong quá khứ ($M-k$).
   - Thuật toán Cascade Recalculation:
     - Cấu hình ngân sách (`monthlyBudget`, `budgetMode`) của mọi tháng trong quá khứ là bất biến.
     - Tính lại chi tiêu và số dư của tháng bị sửa.
     - Lan truyền số dư sang các tháng Rollover tiếp theo.
     - Dừng lan truyền ngay tại tháng đầu tiên có chế độ Reset (vì tháng Reset có số dư đầu kỳ = 0 ₫ bất biến theo PDR-022).
3. **Chính sách Khóa sổ (PDR-021)**:
   - Trong phạm vi MVP, hệ thống **không áp dụng khóa sổ cứng**. Người dùng luôn có toàn quyền chỉnh sửa dữ liệu với modal cảnh báo tác động trước khi lưu.

---

## 6. Schema Migration Strategy (v1 $\rightarrow$ v2)

Khi khởi chạy ứng dụng, hệ thống tự động kiểm tra phiên bản và nâng cấp non-destructive:

```ts
// Logic nâng cấp an toàn trong onupgradeneeded của IndexedDB
if (event.oldVersion < 2) {
  // 1. Tạo Store 'funds'
  if (!db.objectStoreNames.contains('funds')) {
    const fundStore = db.createObjectStore('funds', { keyPath: 'id' });
    fundStore.createIndex('isArchived', 'isArchived', { unique: false });
    fundStore.createIndex('order', 'order', { unique: false });
  }

  // 2. Tạo Store 'fund_monthly_configs' (Normalized Store - PDR-018)
  if (!db.objectStoreNames.contains('fund_monthly_configs')) {
    const configStore = db.createObjectStore('fund_monthly_configs', { keyPath: 'id' });
    configStore.createIndex('fundId', 'fundId', { unique: false });
    configStore.createIndex('yearMonth', 'yearMonth', { unique: false });
  }

  // 3. Nâng cấp Store 'transactions': thêm index 'fundId'
  const txnStore = upgradeTx.objectStore('transactions');
  if (!txnStore.indexNames.contains('fundId')) {
    txnStore.createIndex('fundId', 'fundId', { unique: false });
  }

  // 4. Cập nhật metadata
  const metaStore = upgradeTx.objectStore('metadata');
  metaStore.put({ key: 'schemaVersion', value: 2 });
  metaStore.put({ key: 'upgradedToV2At', value: new Date().toISOString() });
}
```

* **Bảo toàn dữ liệu**: Toàn bộ giao dịch và danh mục cũ được giữ nguyên 100%. Giao dịch v1 tự động mang `fundId: undefined`, được xử lý tự nhiên là giao dịch tự do ngoài ngân sách Quỹ.

---

## 7. Backup & Restore JSON Contract (Version 2)

Hợp đồng xuất nhập file backup định dạng JSON đảm bảo khả năng sao lưu và di chuyển dữ liệu:

```json
{
  "$schema": "https://qlthuchi.local/schemas/v2/backup.json",
  "app": "QL_ThuChi",
  "version": 2,
  "exportedAt": "2026-10-10T08:00:00.000Z",
  "data": {
    "transactions": [
      {
        "id": "txn_a1b2c3d4",
        "type": "expense",
        "amount": 35000,
        "categoryId": "cat_coffee",
        "transactionDate": "2026-10-10",
        "note": "Cà phê sáng",
        "fundId": "fund_life_01",
        "createdAt": "2026-10-10T02:30:00.000Z",
        "updatedAt": "2026-10-10T02:30:00.000Z"
      }
    ],
    "categories": [
      {
        "id": "cat_food",
        "name": "Ăn uống",
        "type": "expense",
        "icon": "Utensils",
        "color": "#F59E0B",
        "isDefault": true,
        "isArchived": false,
        "order": 1,
        "createdAt": "2026-09-01T00:00:00.000Z"
      }
    ],
    "funds": [
      {
        "id": "fund_life_01",
        "name": "Quỹ Sinh Hoạt",
        "icon": "Wallet",
        "color": "#3B82F6",
        "isArchived": false,
        "order": 0,
        "defaultBudget": 5000000,
        "defaultMode": "rollover",
        "createdAt": "2026-10-09T08:00:00.000Z",
        "updatedAt": "2026-10-09T08:00:00.000Z"
      }
    ],
    "fundMonthlyConfigs": [
      {
        "id": "fund_life_01_2026-10",
        "fundId": "fund_life_01",
        "yearMonth": "2026-10",
        "monthlyBudget": 5000000,
        "budgetMode": "rollover",
        "updatedAt": "2026-10-09T08:00:00.000Z"
      }
    ]
  }
}
```

### Quy tắc Tương thích Khi Phục Hồi (Import Compatibility Rules)
1. **Kiểm tra tính hợp lệ trước khi ghi**: File backup được parse và kiểm tra toàn bộ điều kiện hợp lệ trong bộ nhớ trước khi ghi vào IndexedDB. Nếu có bản ghi vi phạm cấu trúc nghiêm trọng, quá trình import bị hủy và báo lỗi chi tiết.
2. **Tương thích ngược v1 $\rightarrow$ v2**: Khi import file backup v1 (chỉ có `transactions` và `categories`), hệ thống tự động gán mảng rỗng `funds: []` và `fundMonthlyConfigs: []`. Toàn bộ giao dịch cũ hiển thị trơn tru.
3. **Bảo vệ giới hạn 10 Quỹ Active**: Nếu file import chứa $> 10$ Quỹ có `isArchived: false`, hệ thống tự động giữ lại 10 Quỹ đầu theo `order` và chuyển các Quỹ còn lại sang trạng thái `isArchived: true` kèm thông báo cho người dùng.
