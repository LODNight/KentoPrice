# Wireframes & Screen Blueprints: Quản lý Quỹ (Fund Management)
## Dự án: QL_ThuChi (Personal Expense Tracker)

---

## 1. Mục đích tài liệu

Tài liệu này cung cấp các bản phác thảo cấu trúc giao diện dạng văn bản (Text-based Wireframes & Screen Blueprints) chuẩn hóa cho toàn bộ chức năng **Quản lý Quỹ**. Các wireframe này mô tả chi tiết thứ bậc thông tin (Information Hierarchy), vị trí các nút bấm (Call to Action - CTA), trạng thái tương tác và hành vi thích ứng (responsive) trên Mobile và Desktop mà không cần viết mã nguồn.

---

## 2. Wireframe 0: Kiến trúc Điều hướng Toàn hệ thống (Navigation Blueprints)

### 2.1. Mobile Navigation (< 768px) — Bottom Navigation Bar (PDR-016 Confirmed)

Đảm bảo bảo vệ tuyệt đối tốc độ ghi chép dưới 5 giây:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              NỘI DUNG MÀN HÌNH                          │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ [🏠 Tổng quan]  [📋 Sổ giao dịch]   ( + CHI | + THU )   [💼 Quỹ]  [📊 Báo cáo] │
└────────────────────────────────────────────────────────────────────────┘
```
* **Chi tiết Thumb Zone**:
  * Cụm nút nổi `( + CHI | + THU )` nằm chính giữa nửa dưới màn hình để chạm ngay bằng ngón cái.
  * Tab `[💼 Quỹ]` nằm bên phải cụm nút nổi, kích thước chạm `48x48px`.
  * Người dùng **không phải đi qua màn hình Quỹ** khi chỉ muốn ghi giao dịch nhanh.

### 2.2. Desktop Navigation (>= 768px) — Top Navigation Bar

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [💰 QL_ThuChi]  Tổng quan │ Sổ giao dịch │ [Quỹ (Active)] │ Báo cáo │ Cài đặt   │
│                                           [+ Thêm Giao Dịch] (Hotkey C)│
├────────────────────────────────────────────────────────────────────────┤
│                              NỘI DUNG MÀN HÌNH                          │
```

---

## 3. Wireframe 1: Danh sách Quỹ (Fund List & Overview Screen)

### 3.1. Phiên bản Mobile (< 768px)

```text
┌────────────────────────────────────────────────────────┐
│ [≡] Thu Chi                    [Tháng 10/2026 ▼]  (⚙)  │
├────────────────────────────────────────────────────────┤
│ QUẢN LÝ QUỸ                                            │
│ Theo dõi ngân sách mục đích chi tiêu                   │
│                                                        │
│ ┌─ Tổng quan ngân sách tháng 10/2026 ────────────────┐ │
│ │ Tổng ngân sách: 12.500.000 ₫                       │ │
│ │ Đã chi:          8.200.000 ₫   [Còn lại: +4.300.000]│ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Quỹ đang hoạt động [ 4 / 10 ]        [+ Thêm Quỹ]      │
│ ────────────────────────────────────────────────────── │
│                                                        │
│ ┌─ Thẻ Quỹ: Quỹ Sinh Hoạt ───────────────────────────┐ │
│ │ 💼 Quỹ Sinh Hoạt                 [Cộng dồn ↻] (···)│ │
│ │ ═════════════════════════════                      │ │
│ │ [██████████████████████░░░░] 75% ngân sách         │ │
│ │ Ngân sách: 5.000.000 ₫   │ Đã chi: 3.750.000 ₫     │ │
│ │ Số dư khả dụng:          │ +1.250.000 ₫            │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─ Thẻ Quỹ: Ăn Uống & Cafe ──────────────────────────┐ │
│ │ ☕ Ăn Uống & Cafe                [Đặt lại ⟳]  (···)│ │
│ │ ═════════════════════════════                      │ │
│ │ [██████████████████████████] 115% ⚠️ VƯỢT NGÂN SÁCH│ │
│ │ Ngân sách: 3.000.000 ₫   │ Đã chi: 3.450.000 ₫     │ │
│ │ Số dư khả dụng:          │ -450.000 ₫ (Rose)       │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─ Thẻ Quỹ: Quỹ Học Tập ─────────────────────────────┐ │
│ │ 📚 Quỹ Học Tập                   [Đặt lại ⟳]  (···)│ │
│ │ ═════════════════════════════                      │ │
│ │ [░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% (Budget = 0 ₫)     │ │
│ │ Ngân sách: 0 ₫           │ Đã chi: 0 ₫             │ │
│ │ Số dư khả dụng:          │ 0 ₫                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                      [ Quỹ đã ẩn (2) → ]               │
│                                                        │
├────────────────────────────────────────────────────────┤
│ [🏠 Tổng quan]   [📋 Sổ giao dịch]   ( + )   [💼 QUỸ]   [📊 Báo cáo] │
└────────────────────────────────────────────────────────┘
```

### 3.2. Trạng thái đặc biệt của Danh sách Quỹ

#### Trạng thái Đạt giới hạn 10/10 Quỹ (Capacity Limit):
```text
│ Quỹ đang hoạt động [ 10 / 10 - Tối đa ]                │
│ [+ Thêm Quỹ (Disabled)]  ℹ️ Đã dùng tối đa 10 Quỹ      │
```

#### Trạng thái Chưa có Quỹ nào (Empty State):
```text
┌────────────────────────────────────────────────────────┐
│                    ┌───────────┐                       │
│                    │  [ 💼 ]   │                       │
│                    └───────────┘                       │
│             CHƯA CÓ QUỸ NGÂN SÁCH NÀO                  │
│   Tạo quỹ giúp bạn chia nhỏ thu nhập theo mục đích     │
│  (Sinh hoạt, Đãi tiệc, Mua sắm) và kiểm soát chi tiêu  │
│                                                        │
│               [ + Tạo Quỹ Đầu Tiên ]                   │
└────────────────────────────────────────────────────────┘
```

#### Trạng thái Lỗi tải dữ liệu (Error State):
```text
┌────────────────────────────────────────────────────────┐
│                    ┌───────────┐                       │
│                    │  [ ⚠️ ]   │                       │
│                    └───────────┘                       │
│             KHÔNG THỂ TẢI DANH SÁCH QUỸ                │
│      Đã xảy ra lỗi khi đọc dữ liệu từ bộ nhớ máy.      │
│                                                        │
│                   [ Tải Lại Dữ Liệu ]                  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Wireframe 2: Biểu mẫu Tạo Quỹ mới (Create Fund Form)

### 4.1. Form Tạo Quỹ (Bottom Sheet trên Mobile / Modal trên Desktop)

```text
┌────────────────────────────────────────────────────────┐
│                       ════ (Kéo nhẹ để đóng)           │
│ [✕]                   TẠO QUỸ MỚI                      │
├────────────────────────────────────────────────────────┤
│ TÊN QUỸ (*)                                            │
│ ┌────────────────────────────────────────── 12/40 ───┐ │
│ │ Quỹ Sinh Hoạt Gia Đình                             │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ HẠN MỨC THÁNG (BUDGET)                                 │
│ ┌────────────────────────────────────────────────────┐ │
│ │  4.500.000 ₫                                       │ │
│ └────────────────────────────────────────────────────┘ │
│ ℹ️ Cho phép nhập 0 ₫ nếu chưa muốn cấp ngân sách cố định │
│                                                        │
│ CHẾ ĐỘ NGÂN SÁCH (*)                                   │
│ ┌────────────────────────────────────────────────────┐ │
│ │ (•) CỘNG DỒN (Rollover)               [Khuyến nghị]│ │
│ │     Số dư dương hoặc âm cuối tháng này sẽ được     │ │
│ │     chuyển tiếp sang tháng sau để bù trừ.          │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ ( ) ĐẶT LẠI MỖI THÁNG (Reset)                      │ │
│ │     Mỗi tháng bắt đầu lại với đúng hạn mức mới.    │ │
│ │     Không cộng dồn số dư hay bù trừ nợ tháng cũ.   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │                    [ TẠO QUỸ ]                     │ │
│ └────────────────────────────────────────────────────┘ │
│                      [ Hủy bỏ ]                        │
└────────────────────────────────────────────────────────┘
```

### 4.2. Lỗi Trùng Tên Quỹ Active (PDR-015 Confirmed Inline Validation)

```text
│ TÊN QUỸ (*)                                            │
│ ┌────────────────────────────────────────── 10/40 ───┐ │
│ │ Sinh hoạt                                          │ │ (Viền đỏ Rose)
│ └────────────────────────────────────────────────────┘ │
│ ⚠️ Đã có Quỹ đang hoạt động tên 'Sinh hoạt'. Vui lòng   │
│    chọn tên khác để tránh nhầm lẫn khi ghi chép.       │
│                                                        │
│ (Toàn bộ số tiền Budget và Chế độ đã nhập được GIỮ NGUYÊN)
```

---

## 5. Wireframe 3: Chi tiết & Chỉnh sửa Quỹ (Fund Detail & Edit Screen)

```text
┌────────────────────────────────────────────────────────┐
│ [← Quay lại]           CHI TIẾT QUỸ                    │
├────────────────────────────────────────────────────────┤
│ ┌─ THẺ TỔNG QUAN QUỸ ────────────────────────────────┐ │
│ │ 💼 Quỹ Sinh Hoạt Gia Đình          [Đang hoạt động]│ │
│ │ Chế độ: Cộng dồn (Rollover)                          │ │
│ │                                                      │ │
│ │ SỐ DƯ HIỆN TẠI THÁNG 10/2026:                        │ │
│ │ + 1.250.000 ₫                                        │ │
│ │                                                      │ │
│ │ Diễn giải công thức:                                 │ │
│ │   Số dư đầu kỳ (Tháng 9):   + 500.000 ₫              │ │
│ │ + Hạn mức tháng 10:         + 4.500.000 ₫            │ │
│ │ - Đã chi tháng 10:          - 3.750.000 ₫            │ │
│ │ = Số dư hiện tại:           = 1.250.000 ₫            │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─ CHỈNH SỬA THÔNG TIN QUỸ ──────────────────────────┐ │
│ │ Tên Quỹ:                                           │ │
│ │ [ Quỹ Sinh Hoạt Gia Đình                         ] │ │
│ │                                                    │ │
│ │ Ngân sách tháng này (Budget):                      │ │
│ │ [ 5.000.000 ₫                                    ] │ │
│ │                                                    │ │
│ │ 🔮 XEM TRƯỚC TÁC ĐỘNG SỐ DƯ (LIVE PREVIEW PDR-012): │ │
│ │ Số dư cũ: 1.250.000 ₫ ➔ SỐ DƯ MỚI: 1.750.000 ₫     │ │
│ │ (Tăng thêm +500.000 ₫ vào số dư tháng này)         │ │
│ │ ℹ️ Lịch sử các tháng đã kết thúc được giữ nguyên   │ │
│ │                                                    │ │
│ │ Chế độ ngân sách:                                  │ │
│ │ [ (•) Cộng dồn ]    [ ( ) Đặt lại mỗi tháng ]      │ │
│ │ (Nhấn đổi chế độ sẽ mở bảng so sánh xác nhận)      │ │
│ │                                                    │ │
│ │               [ Lưu thay đổi Quỹ ]                 │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌─ GIAO DỊCH THUỘC QUỸ TRONG THÁNG (6) ──────────────┐ │
│ │ • 08/10: Siêu thị Co.opmart            - 850.000 ₫ │ │
│ │ • 05/10: Tiền điện nước tháng 9        - 1.400.000 ₫ │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ────────────────────────────────────────────────────── │
│ [ 📦 ẨN QUỸ NÀY ]   (Giữ nguyên toàn bộ lịch sử)      │
└────────────────────────────────────────────────────────┘
```

---

## 6. Wireframe 4: Hộp thoại Xác nhận Đổi Chế độ Ngân sách (Mode Change Modal)

```text
┌──────────────────────────────────────────────────────────┐
│                   ⚠️ CẢNH BÁO TÁC ĐỘNG                   │
│               THAY ĐỔI CHẾ ĐỘ NGÂN SÁCH                  │
├──────────────────────────────────────────────────────────┤
│ Bạn đang chuyển chế độ ngân sách của 'Quỹ Sinh Hoạt':    │
│                                                          │
│   [ Cộng dồn (Rollover) ]  ──▶  [ Đặt lại mỗi tháng ]    │
│                                                          │
│ ℹ️ CHẾ ĐỘ MỚI SẼ KHÔNG CỘNG DỒN SỐ DƯ TỪ THÁNG TRƯỚC:    │
│                                                          │
│ ┌─ SO SÁNH SỐ DƯ THÁNG HIỆN TẠI (10/2026) ─────────────┐ │
│ │ Cách tính cũ (Cộng dồn):      + 1.250.000 ₫          │ │
│ │   (Đã tính 500.000 ₫ dư từ tháng 9 chuyển sang)      │ │
│ │                                                      │ │
│ │ Cách tính mới (Đặt lại):      + 750.000 ₫            │ │
│ │   (Chỉ lấy Hạn mức 4.500k trừ Đã chi 3.750k)         │ │
│ │                                                      │ │
│ │ 📉 CHÊNH LỆCH:                - 500.000 ₫            │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ✓ Toàn bộ giao dịch đã ghi nhận vẫn được giữ nguyên vẹn. │
│ ✓ Lịch sử các tháng đã kết thúc được bảo toàn (PDR-014). │
│                                                          │
│ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │  [ GIỮ NGUYÊN CHẾ ĐỘ CŨ ] │ │ [ XÁC NHẬN CHUYỂN ĐỔI] │ │
│ └───────────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Wireframe 5: Hộp thoại Xác nhận Ẩn Quỹ (Archive Fund Modal)

```text
┌──────────────────────────────────────────────────────────┐
│                   📦 XÁC NHẬN ẨN QUỸ                     │
├──────────────────────────────────────────────────────────┤
│ Bạn có chắc chắn muốn ẩn 'Quỹ Mua sắm'?                  │
│                                                          │
│ ℹ️ LƯU Ý KHI ẨN QUỸ:                                     │
│ • Quỹ sẽ không còn xuất hiện trong danh sách Quỹ Active. │
│ • Quỹ sẽ không hiển thị khi tạo giao dịch mới.           │
│ • Toàn bộ lịch sử giao dịch gắn với Quỹ này VẪN ĐƯỢC     │
│   BẢO TOÀN NGUYÊN VẸN trong Sổ giao dịch và Báo cáo.    │
│ • Bạn có thể khôi phục lại Quỹ bất kỳ lúc nào nếu        │
│   tổng số Quỹ hoạt động chưa vượt quá hạn mức (10 Quỹ).  │
│                                                          │
│ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │         [ HỦY BỎ ]        │ │      [ ẨN QUỸ NÀY ]    │ │
│ └───────────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Wireframe 6: Danh sách Quỹ đã ẩn & Khôi phục (Archived Funds & Restore)

### 8.1. Màn hình Quỹ đã ẩn (Archived Funds Screen)

```text
┌────────────────────────────────────────────────────────┐
│ [← Về Quỹ Active]           DANH SÁCH QUỸ ĐÃ ẨN        │
├────────────────────────────────────────────────────────┤
│ ℹ️ Các Quỹ dưới đây đang tạm ẩn. Lịch sử chi tiêu vẫn   │
│    được lưu trữ đầy đủ.                                │
│                                                        │
│ ┌─ QUỸ ĐÃ ẨN (2) ────────────────────────────────────┐ │
│ │ 📦 Tiệc Tùng Cuối Năm                              │ │
│ │    Đã dùng: 4.500.000 ₫ • Ẩn từ: 15/09/2026        │ │
│ │    [Khôi phục Quỹ]                                 │ │
│ │ ────────────────────────────────────────────────── │ │
│ │ 📦 Mua Laptop Mới                                  │ │
│ │    Đã dùng: 12.000.000 ₫ • Ẩn từ: 01/08/2026       │ │
│ │    [Khôi phục Quỹ]                                 │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 8.2. Hộp thoại Khôi phục khi Quỹ Active đã đạt giới hạn (10/10 Quỹ)

```text
┌──────────────────────────────────────────────────────────┐
│              ⚠️ KHÔNG THỂ KHÔI PHỤC QUỸ                  │
├──────────────────────────────────────────────────────────┤
│ Bạn đã đạt giới hạn tối đa 10 Quỹ đang hoạt động.       │
│                                                          │
│ Để khôi phục 'Tiệc Tùng Cuối Năm', vui lòng ẩn bớt ít    │
│ nhất một Quỹ đang hoạt động khác trước.                  │
│                                                          │
│              [ ĐÃ HIỂU / ĐÓNG HỘP THOẠI ]                │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Wireframe 7: Giao dịch Lịch sử Tham chiếu đến Quỹ Đã Ẩn (PDR-020 Confirmed)

### 9.1. Hiển thị trong Dòng Sổ Giao dịch (Ledger Item Row)

```text
┌────────────────────────────────────────────────────────┐
│ • 15/09/2026: Nhà hàng Sen Tây Hồ        - 1.850.000 ₫ │
│   Ăn uống │ Quỹ: Tiệc Tùng Cuối Năm (Đã ẩn) 🔒         │
└────────────────────────────────────────────────────────┘
```

### 9.2. Mở Form Chỉnh sửa Giao dịch Lịch sử cũ (PDR-020 Confirmed)

```text
┌────────────────────────────────────────────────────────┐
│ [✕]                SỬA GIAO DỊCH                       │
├────────────────────────────────────────────────────────┤
│ SỐ TIỀN: [ 1.850.000 ₫                               ] │
│ DANH MỤC: [ Ăn uống ]                                  │
│                                                        │
│ QUỸ GẮN KẾT:                                           │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🔒 Tiệc Tùng Cuối Năm (Quỹ đã ẩn)                  │ │
│ └────────────────────────────────────────────────────┘ │
│ ℹ️ Quỹ này hiện đã ẩn. Bạn vẫn có thể sửa số tiền, ghi  │
│    chú hoặc danh mục bình thường mà không cần khôi     │
│    phục Quỹ trước.                                     │
│                                                        │
│ [Không đổi Quỹ (Giữ nguyên)]  │  [Chuyển sang Quỹ khác]│
│ (Nếu chuyển Quỹ, chỉ chọn từ danh sách Quỹ Active)     │
│                                                        │
│                  [ LƯU THAY ĐỔI ]                      │
└────────────────────────────────────────────────────────┘
```

---

## 10. Wireframe 8: Cảnh báo Sửa Giao dịch thuộc Tháng đã Kết thúc (PDR-019 Confirmed)

```text
┌──────────────────────────────────────────────────────────┐
│                   ⚠️ CẢNH BÁO TÁC ĐỘNG                   │
│           SỬA GIAO DỊCH THUỘC KỲ ĐÃ KẾT THÚC             │
├──────────────────────────────────────────────────────────┤
│ GIAO DỊCH ĐANG SỬA:                                      │
│ • "Ăn tối Nhà hàng Sen" (15/09/2026)                      │
│ • Số tiền: 1.850.000 ₫ ➔ 2.100.000 ₫ (+250.000 ₫)        │
│                                                          │
│ PHẠM VI ẢNH HƯỞNG:                                       │
│ 1. Tháng 09/2026 (Tháng trực tiếp):                      │
│    • Spending: 1.850.000 ₫ ➔ 2.100.000 ₫                │
│    • Closing Balance: +650.000 ₫ ➔ +400.000 ₫ (-250k)   │
│ 2. Tháng 10/2026 & kế tiếp (Dây chuyền theo PDR-022):     │
│    • Opening Balance T10: +650.000 ₫ ➔ +400.000 ₫       │
│    • (T10 dùng Rollover nên nhận Closing Balance mới)    │
│    • Dừng lan truyền tại tháng đầu tiên dùng Reset.      │
│                                                          │
│ 🔒 BẢO TOÀN CẤU HÌNH LỊCH SỬ:                             │
│ • Thao tác này KHÔNG thay đổi Budget hoặc Mode lịch sử   │
│   của bất kỳ tháng nào. Chỉ số dư dẫn xuất được tính lại.│
│                                                          │
│ Bạn có chắc chắn muốn xác nhận lưu thay đổi?             │
│                                                          │
│ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │         [ HỦY BỎ ]        │ │   [ XÁC NHẬN CẬP NHẬT] │ │
│ └───────────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 11. Wireframe 9: Cảnh báo Chuyển Ngày Giao dịch giữa các Tháng (PDR-019 Confirmed)

```text
┌──────────────────────────────────────────────────────────┐
│                   ⚠️ CHUYỂN KỲ NGÂN SÁCH                 │
│                 GIỮA CÁC THÁNG LỊCH SỬ                   │
├──────────────────────────────────────────────────────────┤
│ GIAO DỊCH ĐANG CHUYỂN:                                   │
│ • "Mua sắm đồ gia dụng" (450.000 ₫)                      │
│ • Ngày cũ: 28/09/2026 (Tháng 09)                         │
│ • Ngày mới: 02/10/2026 (Tháng 10)                        │
│                                                          │
│ TÁC ĐỘNG SỐ DƯ HAI THÁNG (DÙNG CẤU HÌNH RIÊNG TỪNG KỲ):  │
│ • Tháng 09/2026: Giảm Spending 450k ➔ Closing tăng 450k  │
│ • Tháng 10/2026: Tăng Spending 450k ➔ Số dư giảm 450k    │
│ • Các tháng Rollover kế tiếp sẽ tính lại dây chuyền.     │
│                                                          │
│ 🔒 LƯU Ý: Mỗi tháng áp dụng đúng Budget & Mode lịch sử   │
│    của chính tháng đó. Không dùng cấu hình tháng hiện tại│
│    để tính đè lên tháng quá khứ.                         │
│                                                          │
│ ┌───────────────────────────┐ ┌────────────────────────┐ │
│ │         [ HỦY BỎ ]        │ │    [ TIẾP TỤC CHUYỂN ] │ │
│ └───────────────────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 12. Wireframe 10: Xem Chi tiết Quỹ ở Tháng Đã Kết thúc (Read-only View)

```text
┌────────────────────────────────────────────────────────┐
│ [← Về Tháng Hiện Tại]     CHI TIẾT QUỸ (THÁNG 09/2026) │
├────────────────────────────────────────────────────────┤
│ ┌─ THẺ TỔNG QUAN KỲ ĐÃ ĐÓNG SỔ ──────────────────────┐ │
│ │ 💼 Quỹ Sinh Hoạt Gia Đình       🔒 [ĐÃ KẾT THÚC]   │ │
│ │ Chế độ lịch sử: Cộng dồn (Rollover)                  │ │
│ │                                                      │ │
│ │ SỐ DƯ CHỐT SỔ (CLOSING BALANCE):                     │ │
│ │ + 500.000 ₫  (Đã chuyển tiếp sang Tháng 10)          │ │
│ │                                                      │ │
│ │ Historical Budget áp dụng: 4.000.000 ₫               │ │
│ │ Tổng chi tiêu thực tế:     3.800.000 ₫               │ │
│ │ └────────────────────────────────────────────────────┘ │
│ │                                                        │
│ │ ℹ️ Kỳ ngân sách này đã kết thúc. Bạn không thể chỉnh     │
│ │    sửa Budget của tháng đã qua (PDR-013 Confirmed).     │
│ │                                                        │
│ ┌─ GIAO DỊCH ĐÃ GHI NHẬN TRONG THÁNG (8) ────────────┐ │
│ │ • 28/09: Tiền chợ cuối tháng           - 450.000 ₫ │ │
│ │ • 22/09: Mua đồ dùng gia đình          - 600.000 ₫ │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```
