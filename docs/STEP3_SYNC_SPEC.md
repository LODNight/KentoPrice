# Đặc Tả Hợp Đồng Đồng Bộ Dữ Liệu Google Sheets (Bước 3: Sync Contract)

> **Mục tiêu**: Xác lập cấu trúc dữ liệu trên Google Sheets, giao thức API trên Google Apps Script và cơ chế đồng bộ hai chiều (Push & Pull Snapshot) giữa cơ sở dữ liệu nội bộ (IndexedDB Schema v2) và Google Spreadsheet của người dùng.

---

## 1. Kiến Trúc Đồng Bộ (Local-First Sync Architecture)

```
┌──────────────────────────────────────────────┐
│  Ứng Dụng KentoPrice (Frontend Browser)      │
│  - Lưu trữ chính: IndexedDB (Schema v2)       │
│  - Phản hồi tức thì (< 5ms)                  │
└──────────────────────┬───────────────────────┘
                       │
             HTTP POST │ (text/plain JSON payload)
             Redirect  │ 'follow' (Google 302)
             Secret    │ SHARED_SECRET_TOKEN
                       ▼
┌──────────────────────────────────────────────┐
│  Google Apps Script Web App (Backend)        │
│  - Action: init_sheets, push_snapshot,       │
│            pull_snapshot, get_meta, ping     │
└──────────────────────┬───────────────────────┘
                       │
            SpreadsheetApp API (Batch setValues)
                       ▼
┌──────────────────────────────────────────────┐
│  Google Spreadsheet (Cloud Persistence)      │
│  - Transactions | Categories                 │
│  - Funds | FundMonthlyConfigs | Sync_Meta    │
└──────────────────────────────────────────────┘
```

### Nguyên Tắc Cốt Lõi:
1. **Local-First Bất Biến**: Mọi hành vi nhập liệu, sửa, xóa đều lưu vào IndexedDB trước. Mất mạng hoặc API chậm không bao giờ làm gián đoạn việc ghi chép của người dùng.
2. **Batch I/O**: Thay vì ghi từng dòng gây chậm trễ quota của Google Sheets, việc đồng bộ sử dụng `setValues()` và `getValues()` theo lô (Batch).
3. **Bảo Mật Bằng Token**: Mọi thao tác bắt buộc kèm `token` khớp với `SHARED_SECRET_TOKEN` trong Script Properties.

---

## 2. Cấu Trúc Các Tab Google Spreadsheet

Spreadsheet bao gồm 5 Sheet chuẩn hóa tương ứng với các Object Stores trong IndexedDB Schema v2:

### 2.1 Sheet: `Transactions` (Nhật ký giao dịch)
Lưu toàn bộ giao dịch Thu và Chi thực tế.

| Cột | Tên Cột (Header) | Kiểu Dữ Liệu | Ví Dụ | Ghi Chú |
|:---:|---|---|---|---|
| **A** | `id` | Chuỗi (ID) | `txn_1728556800_abc1` | Khóa chính duy nhất |
| **B** | `type` | Chuỗi (`expense` \| `income`) | `expense` | Phân loại Thu hoặc Chi |
| **C** | `amount` | Số nguyên | `45000` | Số tiền VND ($\ge 0$) |
| **D** | `categoryId` | Chuỗi (ID) | `cat_food` | Tham chiếu tới `Categories.id` |
| **E** | `transactionDate` | Chuỗi (`YYYY-MM-DD`) | `2026-10-14` | Ngày phát sinh giao dịch |
| **F** | `note` | Chuỗi | `Cơm trưa văn phòng` | Ghi chú (cho phép rỗng) |
| **G** | `fundId` | Chuỗi (ID) | `fund_living_01` | Tham chiếu `Funds.id` (hoặc rỗng nếu chi tự do) |
| **H** | `createdAt` | Chuỗi (ISO 8601) | `2026-10-14T05:30:00.000Z` | Thời điểm tạo |
| **I** | `updatedAt` | Chuỗi (ISO 8601) | `2026-10-14T05:30:00.000Z` | Thời điểm sửa đổi gần nhất |

---

### 2.2 Sheet: `Categories` (Danh mục Thu/Chi)
Lưu các danh mục mặc định và danh mục tùy chỉnh của người dùng (PDR-023).

| Cột | Tên Cột (Header) | Kiểu Dữ Liệu | Ví Dụ | Ghi Chú |
|:---:|---|---|---|---|
| **A** | `id` | Chuỗi (ID) | `cat_food` | Khóa chính duy nhất |
| **B** | `name` | Chuỗi | `Ăn uống` | Tên danh mục |
| **C** | `type` | Chuỗi (`expense` \| `income`) | `expense` | Loại danh mục |
| **D** | `icon` | Chuỗi | `Utensils` | Tên icon Lucide |
| **E** | `color` | Chuỗi (Hex) | `#F59E0B` | Mã màu hiển thị |
| **F** | `isDefault` | Boolean (`TRUE` / `FALSE`) | `TRUE` | Danh mục mặc định hệ thống |
| **G** | `isArchived` | Boolean (`TRUE` / `FALSE`) | `FALSE` | Đã ẩn / Lưu trữ |
| **H** | `order` | Số nguyên | `1` | Thứ tự sắp xếp hiển thị |
| **I** | `createdAt` | Chuỗi (ISO 8601) | `2026-09-01T00:00:00.000Z` | Thời điểm tạo |

---

### 2.3 Sheet: `Funds` (Quỹ Ngân Sách)
Lưu trữ định danh và thuộc tính cốt lõi của các Quỹ (PDR-008, PDR-009, PDR-018).

| Cột | Tên Cột (Header) | Kiểu Dữ Liệu | Ví Dụ | Ghi Chú |
|:---:|---|---|---|---|
| **A** | `id` | Chuỗi (ID) | `fund_living_01` | Khóa chính duy nhất |
| **B** | `name` | Chuỗi | `Quỹ Sinh Hoạt` | Tên Quỹ |
| **C** | `icon` | Chuỗi | `Wallet` | Icon đại diện |
| **D** | `color` | Chuỗi (Hex) | `#3B82F6` | Màu đại diện |
| **E** | `isArchived` | Boolean (`TRUE` / `FALSE`) | `FALSE` | Trạng thái ẩn quỹ |
| **F** | `order` | Số nguyên | `0` | Thứ tự ưu tiên |
| **G** | `defaultBudget` | Số nguyên | `5000000` | Ngân sách mặc định hàng tháng |
| **H** | `defaultMode` | Chuỗi (`rollover` \| `reset`) | `rollover` | Chế độ tích lũy/làm mới mặc định |
| **I** | `createdAt` | Chuỗi (ISO 8601) | `2026-10-09T08:00:00.000Z` | Thời điểm khởi tạo |
| **J** | `updatedAt` | Chuỗi (ISO 8601) | `2026-10-09T08:00:00.000Z` | Thời điểm sửa đổi gần nhất |

---

### 2.4 Sheet: `FundMonthlyConfigs` (Cấu hình Ngân sách từng tháng)
Lưu cấu hình hạn mức và chế độ của Quỹ theo từng chu kỳ tháng `YYYY-MM` độc lập (PDR-018).

| Cột | Tên Cột (Header) | Kiểu Dữ Liệu | Ví Dụ | Ghi Chú |
|:---:|---|---|---|---|
| **A** | `id` | Chuỗi (ID) | `fund_living_01_2026-10` | Composite key: `${fundId}_${yearMonth}` |
| **B** | `fundId` | Chuỗi (ID) | `fund_living_01` | Tham chiếu tới `Funds.id` |
| **C** | `yearMonth` | Chuỗi (`YYYY-MM`) | `2026-10` | Chu kỳ tháng áp dụng |
| **D** | `monthlyBudget` | Số nguyên | `5000000` | Ngân sách riêng của tháng |
| **E** | `budgetMode` | Chuỗi (`rollover` \| `reset`) | `rollover` | Chế độ riêng của tháng |
| **F** | `updatedAt` | Chuỗi (ISO 8601) | `2026-10-09T08:00:00.000Z` | Thời điểm cập nhật |

---

### 2.5 Sheet: `Sync_Meta` (Metadata Đồng Bộ)
Lưu thông số kỹ thuật và trạng thái đồng bộ của bảng tính.

| Cột | Tên Cột (Header) | Kiểu Dữ Liệu | Ví Dụ | Ghi Chú |
|:---:|---|---|---|---|
| **A** | `key` | Chuỗi | `last_synced_at` | Khóa metadata |
| **B** | `value` | Chuỗi | `2026-10-14T13:20:00.000Z` | Giá trị lưu trữ |
| **C** | `updatedAt` | Chuỗi (ISO 8601) | `2026-10-14T13:20:00.000Z` | Thời gian ghi nhận |

Các khóa metadata chuẩn:
* `schema_version`: `2`
* `app_name`: `QL_ThuChi`
* `last_snapshot_at`: Thời điểm push snapshot gần nhất
* `device_agent`: Tên thiết bị hoặc trình duyệt đồng bộ

---

## 3. Danh Mục API Actions Trên Google Apps Script

Mọi request gửi lên Web App sử dụng phương thức **HTTP POST** với Header `Content-Type: text/plain;charset=utf-8` để tránh preflight CORS OPTIONS và chứa payload JSON:

### 3.1 `action: "ping"`
Kiểm tra kết nối và độ trễ.
* **Request Payload**:
  ```json
  { "action": "ping", "token": "kentoprice123123", "clientTimestamp": 1728900000000 }
  ```
* **Response**:
  ```json
  { "ok": true, "action": "ping", "serverTime": "2026-10-14T13:11:36.110Z", "message": "Pong! Kết nối Google Apps Script thành công." }
  ```

---

### 3.2 `action: "init_sheets"`
Khởi tạo cấu trúc các Sheet nếu chưa có, tự động tạo header, định dạng màu sắc trang nhã và freeze hàng đầu tiên.
* **Request Payload**:
  ```json
  { "action": "init_sheets", "token": "kentoprice123123" }
  ```
* **Response**:
  ```json
  {
    "ok": true,
    "action": "init_sheets",
    "createdSheets": ["Transactions", "Categories", "Funds", "FundMonthlyConfigs", "Sync_Meta"],
    "message": "Khởi tạo cấu trúc 5 bảng tính thành công."
  }
  ```

---

### 3.3 `action: "push_snapshot"`
Đẩy toàn bộ dữ liệu hiện tại từ client (IndexedDB) lên ghi đè / làm mới các Sheet trên Google Spreadsheet.
* **Request Payload**:
  ```json
  {
    "action": "push_snapshot",
    "token": "kentoprice123123",
    "data": {
      "transactions": [ ... ],
      "categories": [ ... ],
      "funds": [ ... ],
      "fundMonthlyConfigs": [ ... ]
    },
    "meta": {
      "device": "Web Browser",
      "timestamp": "2026-10-14T13:20:00.000Z"
    }
  }
  ```
* **Response**:
  ```json
  {
    "ok": true,
    "action": "push_snapshot",
    "counts": {
      "transactions": 42,
      "categories": 16,
      "funds": 3,
      "fundMonthlyConfigs": 6
    },
    "syncedAt": "2026-10-14T13:20:05.120Z",
    "message": "Đã lưu trữ an toàn toàn bộ dữ liệu lên Google Sheets."
  }
  ```

---

### 3.4 `action: "pull_snapshot"`
Đọc toàn bộ dữ liệu từ 4 Sheet và trả về định dạng chuẩn `BackupDataV2` để client khôi phục hoặc so khớp.
* **Request Payload**:
  ```json
  { "action": "pull_snapshot", "token": "kentoprice123123" }
  ```
* **Response**:
  ```json
  {
    "ok": true,
    "action": "pull_snapshot",
    "data": {
      "transactions": [ ... ],
      "categories": [ ... ],
      "funds": [ ... ],
      "fundMonthlyConfigs": [ ... ]
    },
    "counts": {
      "transactions": 42,
      "categories": 16,
      "funds": 3,
      "fundMonthlyConfigs": 6
    },
    "pulledAt": "2026-10-14T13:22:00.000Z"
  }
  ```

---

### 3.5 `action: "get_meta"`
Kiểm tra nhanh số lượng bản ghi và lần đồng bộ cuối cùng trên Sheet mà không cần tải toàn bộ nội dung chi tiết.
* **Request Payload**:
  ```json
  { "action": "get_meta", "token": "kentoprice123123" }
  ```
* **Response**:
  ```json
  {
    "ok": true,
    "action": "get_meta",
    "counts": {
      "transactions": 42,
      "categories": 16,
      "funds": 3,
      "fundMonthlyConfigs": 6
    },
    "lastSyncedAt": "2026-10-14T13:20:05.120Z",
    "schemaVersion": 2
  }
  ```

---

## 4. Quy Tắc Xử Lý Dữ Liệu Khi Chuyển Đổi (Mapping & Type Conversions)

1. **Boolean**:
   * Khi ghi lên Sheet: chuyển thành `TRUE` / `FALSE`.
   * Khi đọc về JS: giá trị `true`, `"TRUE"`, `"true"`, `1` được parse thành `true`; ngược lại là `false`.
2. **Số (Number)**:
   * Các cột `amount`, `order`, `defaultBudget`, `monthlyBudget` được parse an toàn bằng `Number(val) || 0`.
3. **Giá trị rỗng / Nullable (`note`, `fundId`)**:
   * Nếu `note` rỗng $\rightarrow$ chuỗi `""`.
   * Nếu `fundId` là `null` hoặc `undefined` $\rightarrow$ ghi ô trống `""` trên Sheet; khi đọc về nếu ô rỗng $\rightarrow$ `undefined` để giữ nguyên tương thích schema v1/v2.
4. **Header Format**:
   * Hàng 1 (Header) có nền màu xanh đen sang trọng (`#1E293B`), chữ trắng in đậm, canh giữa và đóng băng cố định hàng 1 (`setFrozenRows(1)`).
