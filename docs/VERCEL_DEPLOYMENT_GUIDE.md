# Hướng Dẫn Deploy KentoPrice Lên Vercel 🚀

Tài liệu hướng dẫn triển khai ứng dụng **KentoPrice (Quản Lý Thu Chi Cá Nhân)** lên nền tảng **Vercel** miễn phí, nhanh chóng với đầy đủ cấu hình CI/CD và đồng bộ Google Sheets tự động.

---

## 1. Chuẩn Bị & Cấu Hình Sẵn Có

Dự án đã được cấu hình tối ưu sẵn cho Vercel:
- File [`vercel.json`](../vercel.json): Định tuyến toàn bộ request về `index.html` (tránh lỗi 404 khi F5 tải lại trang) và cấu hình cache tối ưu cho static assets (`/assets/*`).
- File [`.env.example`](../.env.example): Mẫu 2 biến môi trường kết nối Google Apps Script.
- Lệnh build: `npm run build` (`tsc -b && vite build`)
- Thư mục đầu ra (Output Directory): `dist`

---

## 2. Cách 1: Deploy qua Giao Diện Vercel Web & GitHub (Khuyên dùng)

Đây là cách đơn giản và tốt nhất vì mỗi khi bạn `git push` lên GitHub, Vercel sẽ tự động build và deploy phiên bản mới nhất.

### Bước 1: Đẩy mã nguồn lên GitHub
Nếu bạn chưa push các commit mới nhất lên GitHub:
```bash
git push origin main
```

### Bước 2: Nhập Repository trên Vercel
1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập (bằng tài khoản GitHub).
2. Tại trang Dashboard, nhấn nút **Add New...** -> chọn **Project**.
3. Tìm và chọn kho lưu trữ GitHub của bạn (`QL_ThuChi` hoặc tên repo tương ứng) -> nhấn **Import**.

### Bước 3: Cấu hình Dự án trên Vercel
- **Framework Preset**: Vercel sẽ tự nhận diện là `Vite`.
- **Root Directory**: `./` (để mặc định).
- **Build Command**: `npm run build` (mặc định).
- **Output Directory**: `dist` (mặc định).

### Bước 4: Thêm Biến Môi Trường (Environment Variables)
Tại mục **Environment Variables**, bạn có thể thêm 2 biến sau để ứng dụng kết nối trực tiếp với Google Sheets mà không cần nhập lại token trên trình duyệt mới:

| Tên biến (Key) | Giá trị (Value) | Mô tả |
| :--- | :--- | :--- |
| `VITE_GAS_WEBAPP_URL` | `https://script.google.com/macros/s/.../exec` | URL Web App Google Apps Script của bạn |
| `VITE_GAS_TOKEN` | `kentoprice123123` | Mã Secret Token bạn đã cấu hình |

*(Lưu ý: Nếu không thêm biến môi trường, người dùng vẫn có thể vào mục Cài đặt -> Đồng bộ Google Sheets -> Cấu hình nâng cao trên web để nhập thủ công).*

### Bước 5: Nhấn Deploy
- Nhấn **Deploy**.
- Chờ khoảng 30 - 45 giây để Vercel build. Khi hoàn tất, bạn sẽ nhận được đường link dạng:
  `https://your-project-name.vercel.app`

---

## 3. Cách 2: Deploy Nhanh bằng Vercel CLI (Dòng Lệnh)

Nếu bạn muốn deploy trực tiếp từ terminal mà không cần thông qua GitHub:

### Bước 1: Cài đặt và đăng nhập Vercel CLI
```bash
npx vercel login
```
Làm theo hướng dẫn trên màn hình để xác thực qua trình duyệt email hoặc GitHub.

### Bước 2: Triển khai môi trường Production
Chạy lệnh:
```bash
npx vercel --prod
```
- Khi Vercel hỏi `Set up and deploy?`, chọn `Y`.
- Chọn scope tài khoản cá nhân của bạn.
- Khi hỏi `Link to existing project?`, chọn `N` (nếu là lần đầu).
- Điền tên dự án (ví dụ: `kentoprice`).
- Vercel CLI sẽ tự nhận diện Vite và deploy toàn bộ thư mục `dist`.

---

## 4. Kiểm Tra Sau Khi Triển Khai (Post-Deploy Checklist)

1. **Kiểm tra PWA & Local Storage**: Mở link Vercel trên điện thoại hoặc máy tính. Giao diện tải mượt mà dưới 1 giây.
2. **Kiểm tra Đồng bộ Google Sheets**:
   - Vào **Cài đặt** -> **Đồng bộ Google Sheets**.
   - Bấm **Kiểm tra kết nối (Ping)**: Nhận phản hồi thành công (`duration ~300ms - 800ms`).
3. **Kiểm tra Tự động đồng bộ ngầm (Hướng 3)**:
   - Thêm một giao dịch thử nghiệm bất kỳ.
   - Quan sát góc trên thanh Header: Sau 3 giây, pill trạng thái chuyển sang **✓ Đã lưu Cloud**.
   - Mở Google Spreadsheet của bạn để kiểm tra: dòng giao dịch mới đã xuất hiện ngay lập tức!
4. **Cài đặt thành ứng dụng trên điện thoại (Add to Home Screen)**:
   - Trên Safari (iOS): Bấm nút Share -> Chọn **Thêm vào MH chính (Add to Home Screen)**.
   - Trên Chrome (Android): Bấm menu 3 chấm -> Chọn **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.
   - Ứng dụng sẽ mở toàn màn hình độc lập như app native!
