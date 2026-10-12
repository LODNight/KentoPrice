# Shared UX Rules & Interaction Principles
## Dự án: QL_ThuChi (Personal Expense Tracker)

---

## 1. Mục đích tài liệu

Tài liệu này quy chuẩn hóa các nguyên tắc trải nghiệm người dùng (UX Rules) mang tính hệ thống trong ứng dụng **QL_ThuChi**. Tất cả các màn hình, thành phần giao diện và tính năng (bao gồm Quản lý Thu Chi và Quản lý Quỹ) phải tuân thủ nghiêm ngặt các quy tắc này để đảm bảo tính nhất quán, bảo vệ trải nghiệm người dùng và giữ vững phong cách **Calm, Minimal, Data-First**.

---

## 2. Quy tắc Hiển thị Số liệu, Tiền tệ & Ngân sách (Currency & Budget Rules)

* **R-NUM-01 (Định dạng VND chuẩn)**:
  * Số tiền luôn là số nguyên, không có phần thập phân (`1.500.000 ₫`, không bao giờ hiển thị `1500000.00`).
  * Dấu chấm `.` làm phân cách hàng nghìn; ký hiệu tiền tệ `₫` đặt ở cuối, theo format chuẩn locale `vi-VN`.
* **R-NUM-02 (Căn chỉnh số Tabular Figures)**:
  * Tất cả các trường hiển thị số tiền, phần trăm, số đếm và ngày tháng phải sử dụng thuộc tính CSS: `font-variant-numeric: tabular-nums`.
  * Đảm bảo các chữ số có chiều rộng cố định, không làm giật hàng dọc khi số liệu nhảy real-time.
* **R-NUM-03 (Quy tắc hiển thị Số dư Âm & Bội chi)**:
  * Khi số dư bị âm (bội chi / vượt ngân sách):
    * Bắt buộc có tiền tố dấu trừ `-` đặt ngay trước con số (ví dụ: `-250.000 ₫`).
    * Sử dụng màu cảnh báo `--color-expense` (Rose `#F43F5E`).
    * **Không dùng màu sắc làm tín hiệu duy nhất**: Luôn bổ sung biểu tượng cảnh báo SVG (`AlertTriangle`) và nhãn phụ giải thích rõ ràng (e.g. `Vượt 250.000 ₫`).
* **R-NUM-04 (Phân biệt Budget vs Số dư khả dụng)**:
  * Giao diện phải phân biệt rạch ròi giữa **Budget** (Hạn mức chi tiêu được cấp trong tháng) và **Current Balance** (Số tiền thực tế còn lại có thể tiêu).
  * Tuyệt đối không trình bày gây hiểu nhầm Budget là tiền mặt sẵn có.
* **R-NUM-05 (Công thức tính toán nhất quán)**:
  * Chế độ Cộng dồn (`rollover`): `Current Balance = Opening Balance + Budget - Spending`.
  * Chế độ Đặt lại (`reset`): `Current Balance = Budget - Spending`.
* **R-NUM-06 (Hỗ trợ nhập liệu số tức thì)**:
  * Trường nhập tiền trên Mobile phải khai báo `inputMode="numeric"` để kích hoạt bàn phím số lập tức.
  * Tự động định dạng phân cách hàng nghìn theo thời gian thực khi người dùng gõ (nhập `50000` hiển thị ngay `50.000 ₫`).

---

## 3. Quy tắc Không Chặn Thao Tác (Non-Blocking Interaction Rule)

* **R-BLK-01 (Không chặn ghi nhận giao dịch vì ngân sách)**:
  * Ngân sách và Quỹ đóng vai trò **la bàn định hướng và kiểm soát**, không phải chốt chặn của thủ kho doanh nghiệp.
  * Khi một Quỹ đã hết tiền hoặc đang có số dư âm, người dùng **vẫn được phép chọn Quỹ đó để ghi nhận khoản chi**.
  * Ứng dụng chỉ hiển thị cảnh báo nhẹ nhàng về việc bội chi, tuyệt đối không vô hiệu hóa nút Lưu hoặc chặn người dùng ghi nhận thực tế chi tiêu.
* **R-BLK-02 (Không ép buộc dữ liệu phụ)**:
  * Các trường không bắt buộc (Ghi chú, Quỹ, Ngày quá khứ) phải được đặt ở vị trí thứ yếu, không làm tăng số bước của luồng thao tác chính dưới 5 giây.

---

## 4. Quy tắc Giới hạn Thực thể & Tên Duy Nhất (Capacity & Identity Rules)

* **R-CAP-01 (Minh bạch giới hạn 10 Quỹ Active)**:
  * Luôn hiển thị chỉ số sử dụng hiện tại (ví dụ badge `4/10 Quỹ`).
  * Khi đạt đến giới hạn `10/10`, nút thêm mới chuyển sang trạng thái disabled rõ ràng kèm tooltip giải thích.
* **R-CAP-02 (Không tự động can thiệp dữ liệu để giải phóng chỗ trống)**:
  * Khi người dùng cố gắng thêm hoặc khôi phục vượt quá giới hạn 10 Quỹ, hệ thống **không bao giờ tự ý ẩn hoặc xóa** một thực thể khác để nhường chỗ.
  * Phải đưa ra thông báo rõ ràng và trao quyền quyết định chọn thực thể cần ẩn cho người dùng.
* **R-NAME-01 (Tên Quỹ duy nhất trong nhóm Active - PDR-015 Confirmed)**:
  * Chuẩn hóa tên khi so sánh: Loại bỏ khoảng trắng đầu/cuối (`.trim()`) và chuyển về chữ thường (`.toLowerCase()`).
  * Không cho phép 2 Quỹ đang Active có tên trùng nhau sau chuẩn hóa (ví dụ: `Sinh hoạt` trùng với `sinh hoạt`).
  * Khi phát hiện trùng: Báo lỗi inline cụ thể ngay dưới ô nhập tên; **giữ nguyên 100% dữ liệu form** đã nhập.
  * Quỹ đã ẩn (`Archived`) được phép trùng tên với Quỹ Active, nhưng khi khôi phục bắt buộc phải đổi tên trước nếu có xung đột.

---

## 5. Quy tắc Xác nhận Tác động Tài chính & Đổi Chế độ (Impact Confirmation Rules)

* **R-CNF-01 (Nguyên tắc tiết chế Modal xác nhận)**:
  * Không bắt người dùng xác nhận nhiều lần cho các thao tác thông thường (thêm mới, sửa tên, chỉnh budget cơ bản).
  * Chỉ hiển thị Modal xác nhận khi: (1) Đổi chế độ ngân sách; (2) Ẩn Quỹ; (3) Thoát form đang nhập dở (Dirty form).
* **R-CNF-02 (Xem trước tác động Trước và Sau - Before/After Diff - PDR-014 Confirmed)**:
  * Khi đổi chế độ ngân sách (`rollover` ↔ `reset`), Modal xác nhận bắt buộc trình bày:
    * Chế độ hiện tại ➔ Chế độ mới.
    * Số dư theo cách tính cũ vs Số dư theo cách tính mới.
    * Chênh lệch cụ thể kèm giải thích vì sao có sự thay đổi.
* **R-CNF-03 (Xử lý đổi chế độ nhiều lần trong một tháng — PDR-017 Confirmed)**:
  * Áp dụng nguyên tắc **Tính lại tháng hiện tại theo cấu hình hiện hành (Mô hình A — Calendar Month Level)**.
  * Khi đổi Budget hoặc Mode, số dư tính lại từ dữ liệu nguồn theo cấu hình cuối cùng có hiệu lực.
  * Nguồn `Opening Balance` lấy từ `Closing Balance` của tháng liền trước ($M-1$) đã chốt sổ nếu là Rollover (theo PDR-022), hoặc bằng `0 ₫` nếu là Reset.
  * `Current Balance = Opening Balance + Monthly Budget - Monthly Spending`.
  * Tuyệt đối không cộng chồng hay tích lũy số dư của các lần chuyển đổi chế độ trung gian trong tháng.
  * Chuỗi `rollover → reset → rollover` cho kết quả giống hệt tính trực tiếp với `rollover`. Thao tác xen kẽ luôn cho kết quả tất định.

---

## 6. Quy tắc Bảo toàn Lịch sử & Dữ liệu Quỹ Đã Ẩn (Historical Integrity Rules)

* **R-HIS-01 (Bảo toàn Cấu hình Budget các tháng đã kết thúc — PDR-013 Confirmed)**:
  * Sửa Budget hiện tại chỉ áp dụng từ tháng hiện tại và tương lai.
  * **Tuyệt đối không hồi tố** vào các tháng đã kết thúc; giữ nguyên cấu hình `Historical Budget` và `Historical Mode` quá khứ.
  * Phân biệt rõ: Cấu hình lịch sử là bất biến. Số liệu dẫn xuất (Số dư, Tổng chi) sẽ giữ nguyên trừ khi người dùng sửa giao dịch thuộc tháng đó.
  * Khoản đã chi trong tháng hiện tại không bị thay đổi chỉ vì Budget được chỉnh sửa.
* **R-HIS-02 (Giao dịch lịch sử gắn với Quỹ đã ẩn — PDR-020 Confirmed)**:
  * Việc ẩn Quỹ không xóa hoặc làm đứt liên kết `fundId` trên giao dịch cũ; không tự động đổi `fundId` thành `null`.
  * Trong danh sách giao dịch và báo cáo, Quỹ ẩn hiển thị tên bình thường kèm nhãn mờ `(Đã ẩn)`.
  * Người dùng được phép sửa số tiền, ghi chú của giao dịch cũ gắn Quỹ ẩn mà **không cần khôi phục Quỹ trước**.
  * Việc sửa giao dịch không được tự động khôi phục Quỹ.
* **R-HIS-03 (Loại trừ Quỹ ẩn khỏi giao dịch mới — PDR-020 Confirmed)**:
  * Khi tạo giao dịch mới, dropdown chọn Quỹ chỉ hiển thị các Quỹ đang Active; hoàn toàn không hiển thị Quỹ đã ẩn.
  * Khi sửa giao dịch cũ, nếu đổi Quỹ thì chỉ cho phép chọn từ danh sách Quỹ đang Active.
* **R-HIS-04 (Chỉnh sửa giao dịch thuộc tháng đã kết thúc & Cảnh báo Lan truyền — PDR-019 Confirmed)**:
  * Cho phép người dùng chỉnh sửa hoặc xóa giao dịch lịch sử.
  * Giữ nguyên Budget/Mode lịch sử của các tháng bị ảnh hưởng.
  * Tính lại Spending và Closing Balance của tháng cũ, lan truyền (Cascade) sang các tháng Rollover kế tiếp theo PDR-022; dừng lại khi gặp tháng Reset.
  * **Bắt buộc hiển thị Modal cảnh báo trước khi lưu**:
    * Mô tả giao dịch đang sửa, tháng trực tiếp bị ảnh hưởng, các tháng tiếp theo có thể thay đổi số dư.
    * Hiển thị số dư trước và sau thay đổi nếu có thể xác định chính xác.
    * **Tuyệt đối không hiển thị số liệu giả định như kết quả đã tính chính xác**; nếu chưa thể xác định đầy đủ tác động, phải nêu rõ giới hạn.
    * Nêu rõ việc sửa không thay đổi Budget/Mode lịch sử; cho phép người dùng xác nhận hoặc hủy thao tác.
* **R-HIS-05 (Chuyển ngày giao dịch làm chuyển kỳ ngân sách — PDR-019 Confirmed)**:
  * Khi sửa ngày đưa giao dịch từ tháng này sang tháng khác:
    * Bắt buộc hiển thị Modal xác nhận cảnh báo hạn mức và số dư của cả 2 tháng liên quan sẽ bị tính toán lại theo cấu hình lịch sử của từng tháng.
* **R-HIS-06 (Chuyển giao dịch từ Quỹ này sang Quỹ khác)**:
  * Chi tiêu được hoàn trả về Quỹ nguồn và khấu trừ vào Quỹ đích.
  * Nếu thuộc tháng đã kết thúc: Hiển thị Modal cảnh báo tác động đến số dư đã chốt của cả 2 Quỹ trong kỳ quá khứ.
* **R-HIS-07 (Chỉnh sửa giao dịch của Quỹ đã ẩn — PDR-020 Confirmed)**:
  * Hệ thống tự động cập nhật lại số dư lịch sử của Quỹ đã ẩn tương ứng; không yêu cầu Quỹ phải chuyển về Active.
* **R-HIS-08 (Chuyển giao số dư liên kỳ M sang M+1 — PDR-022 Confirmed)**:
  * **Target-Month Rule**: Chế độ của tháng đích $M+1$ quyết định Opening Balance của chính nó:
    * Nếu tháng $M+1$ là `rollover`: $\text{Opening Balance}_{(M+1)} = \text{Closing Balance}_{(M)}$ (kế thừa trọn vẹn cả dương, âm, và bằng 0).
    * Nếu tháng $M+1$ là `reset`: $\text{Opening Balance}_{(M+1)} = 0\text{ ₫}$ (đối xứng cho cả dương, âm, và bằng 0).
  * **Không diễn giải Reset là xóa vĩnh viễn Closing Balance**: Tháng Reset vẫn có Closing Balance đầy đủ; nếu tháng kế tiếp là Rollover, tháng kế tiếp vẫn nhận Closing Balance này.




---

## 7. Quy tắc Điều hướng & Trải nghiệm Responsive (Navigation & Speed Rules)

* **R-NAV-01 (Bảo toàn tốc độ ghi nhận dưới 5 giây - PDR-016 Confirmed)**:
  * Việc thêm mục Quỹ vào thanh điều hướng chính **tuyệt đối không làm tăng thêm thao tác** khi ghi nhận thu chi.
  * Người dùng có thể nhấn `+ Chi` / `+ Thu` trực tiếp từ Bottom Nav (Mobile) hoặc Header (Desktop) mà không cần đi qua màn hình Quỹ.
* **R-NAV-02 (Cấu trúc Bottom Nav trên Mobile)**:
  * 4 tabs: `Tổng quan` | `Sổ giao dịch` | `Quỹ` | `Báo cáo`.
  * Cụm nút nổi `+ Chi` / `+ Thu` đặt ở vị trí trung tâm, tối ưu hóa cho vùng ngón tay cái (Thumb zone).
* **R-NAV-03 (Kích thước vùng chạm cảm ứng)**:
  * Mọi nút bấm, tab điều hướng, chip chọn danh mục/quỹ phải có kích thước tối thiểu **44 × 44 px**.
* **R-NAV-04 (Tuyệt đối không dùng Emoji làm Icon hệ thống)**:
  * Toàn bộ biểu tượng giao diện phải là SVG vector đồng bộ từ thư viện thiết kế (như Lucide Icons).

---

## 8. Quy tắc Biểu mẫu, Trạng thái Bẩn & Phản hồi (Form & Feedback Rules)

* **R-FRM-01 (Bảo vệ công sức nhập liệu - Dirty Form)**:
  * Nếu form đã bị sửa ít nhất một trường và người dùng có ý định đóng: Hiển thị cảnh báo xác nhận *"Hủy thao tác? Dữ liệu bạn vừa nhập sẽ không được lưu."*.
  * Nếu form chưa hề bị chỉnh sửa (form clean): Cho phép đóng ngay lập tức không hỏi thêm.
* **R-FDB-01 (Không báo thành công giả)**:
  * Không bao giờ hiển thị Toast "Đã lưu thành công" trước khi thao tác ghi xuống bộ nhớ lưu trữ thực sự hoàn tất mà không phát sinh lỗi.
* **R-FDB-02 (Ngăn chặn Double-Tap)**:
  * Khi bấm Submit, nút bấm lập tức chuyển sang trạng thái disabled và hiển thị spinner/icon xoay nhẹ.
