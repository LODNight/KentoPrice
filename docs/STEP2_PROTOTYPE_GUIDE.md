# Hướng Dẫn Thử Nghiệm Prototype Google Apps Script `ping` (Bước 2)

> **LƯU Ý QUAN TRỌNG:**
> Tài liệu này chỉ chuẩn bị cho Bước 2. **Chưa chuyển nguồn dữ liệu chính thức sang Google Sheets và chưa thực hiện migration dữ liệu thật.**
> Chỉ xác nhận Prototype thành công khi đã có **kết quả chạy thực tế** từ phía người dùng.

---

## 1. Mục tiêu Kiểm chứng Kỹ thuật

| Tiêu chí | Mục đích kiểm tra | Kết quả kỳ vọng |
|---|---|---|
| **Google Apps Script Web App Deployment** | Kiểm tra quyền truy cập Web App | Người dùng deploy với quyền `Anyone` |
| **Xử lý HTTP 302 Redirect của Google** | Apps Script Web App luôn redirect 302 sang `script.googleusercontent.com` | Trình duyệt `fetch()` tự động theo redirect (`redirect: 'follow'`) mà không mất dữ liệu |
| **CORS Header** | Kiểm tra xem trình duyệt có chặn Origin không | Phản hồi JSON nhận được trơn tru trong Console frontend |
| **Shared Secret Token Validation** | Xác thực Token cấu hình trong `Script Properties` | Token đúng $\rightarrow$ `ok: true`; Token sai/thiếu $\rightarrow$ `ERR_UNAUTHORIZED` |
| **Đo lường độ trễ (Round-trip Latency)** | Ghi nhận thời gian đáp ứng thực tế của Google Apps Script | Đo đạc thời gian tính bằng milliseconds (ms) để đánh giá UX |

---

## 2. Quy trình Cấu hình Google Apps Script

### Bước 2.1: Tạo Google Spreadsheet & Mở Apps Script
1. Mở [Google Sheets](https://sheets.new) tạo một Sheet mới đặt tên: `QL_ThuChi_Data_Prototype`.
2. Trên thanh menu, chọn **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.
3. Đổi tên dự án Apps Script thành: `QL_ThuChi_Backend_Prototype`.

### Bước 2.2: Dán mã nguồn Prototype
1. Xóa nội dung mặc định trong file `Code.gs`.
2. Copy toàn bộ nội dung từ file [`google-apps-script/ping_prototype.gs`](file:///d:/Coding_Design/Personal/QL_ThuChi/google-apps-script/ping_prototype.gs) dán vào `Code.gs`.
3. Bấm **Lưu (Ctrl + S)**.

### Bước 2.3: Cấu hình Secret Token trong Script Properties (Không hardcode)
1. Trong giao diện Apps Script, bấm vào biểu tượng **Cài đặt dự án (Project Settings - hình bánh răng)** ở thanh menu trái.
2. Cuộn xuống phần **Các thuộc tính của tập lệnh (Script Properties)**.
3. Bấm **Thêm thuộc tính của tập lệnh (Add script property)**:
   - **Thuộc tính (Property)**: `SHARED_SECRET_TOKEN`
   - **Giá trị (Value)**: Chọn một chuỗi bí mật bất kỳ (Ví dụ: `qlthuchi_secret_test_2026_xyz`)
4. Bấm **Lưu các thuộc tính của tập lệnh (Save script properties)**.

### Bước 2.4: Triển khai dưới dạng Web App (Deploy as Web App)
1. Ở góc trên bên phải, bấm nút **Triển khai (Deploy)** $\rightarrow$ **Triển khai mới (New deployment)**.
2. Chọn loại triển khai: Bấm hình bánh răng $\rightarrow$ chọn **Ứng dụng web (Web app)**.
3. Cấu hình các thông số:
   - **Mô tả (Description)**: `Prototype Ping v1`
   - **Thực thi dưới dạng (Execute as)**: **Tôi (tài khoản Google của bạn)**
   - **Người có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(Bắt buộc chọn Anyone để ứng dụng Frontend có thể gửi request qua API mà không bị chặn bởi trang Google Login)*.
4. Bấm **Triển khai (Deploy)**.
5. Sao chép lại **URL của ứng dụng web (Web App URL)** (có dạng `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 3. Kịch bản Kiểm thử Thực tế từ Môi trường Frontend

Mở ứng dụng KentoPrice tại `http://localhost:5173`, nhấn **F12** mở tab **Console** và chạy các đoạn script kiểm thử sau:

### Kịch bản 1: Kiểm tra GET Ping & Đo độ trễ
```javascript
async function testGetPing(webAppUrl, token) {
  const start = performance.now();
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'ping');
    url.searchParams.set('token', token);

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });
    const data = await res.json();
    const duration = Math.round(performance.now() - start);

    console.log('✅ GET Ping Thành công:', data);
    console.log(`⏱️ Độ trễ (Round-trip): ${duration} ms`);
    return { ok: true, duration, data };
  } catch (err) {
    console.error('❌ GET Ping Thất bại:', err);
    return { ok: false, error: err };
  }
}

// Thay URL và TOKEN của bạn:
// testGetPing('https://script.google.com/macros/s/.../exec', 'qlthuchi_secret_test_2026_xyz');
```

### Kịch bản 2: Kiểm tra POST Ping (Payload JSON)
```javascript
async function testPostPing(webAppUrl, token) {
  const start = performance.now();
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script khuyến nghị text/plain để tránh CORS preflight OPTIONS block
      },
      body: JSON.stringify({
        action: 'ping',
        token: token,
        clientTimestamp: Date.now(),
      }),
    });
    const data = await res.json();
    const duration = Math.round(performance.now() - start);

    console.log('✅ POST Ping Thành công:', data);
    console.log(`⏱️ Độ trễ (Round-trip): ${duration} ms`);
    return { ok: true, duration, data };
  } catch (err) {
    console.error('❌ POST Ping Thất bại:', err);
    return { ok: false, error: err };
  }
}
```

### Kịch bản 3: Kiểm tra Token sai / Không hợp lệ (Bảo mật endpoint)
```javascript
async function testInvalidToken(webAppUrl) {
  try {
    const res = await fetch(`${webAppUrl}?action=ping&token=wrong_token_123`, {
      method: 'GET',
      redirect: 'follow',
    });
    const data = await res.json();
    console.log('Kết quả kiểm tra Token sai (Kỳ vọng code: ERR_UNAUTHORIZED):', data);
    if (data.code === 'ERR_UNAUTHORIZED') {
      console.log('✅ Endpoint từ chối token sai thành công.');
    } else {
      console.warn('⚠️ Cảnh báo: Endpoint không từ chối token sai như mong đợi.');
    }
  } catch (err) {
    console.error('❌ Lỗi request:', err);
  }
}
```

---

## 4. Bảng Ghi Nhận Kết Quả Kiểm Thử (User Acceptance Checklist)

Đã hoàn thành kiểm thử thực tế trên cả môi trường Node và Trình duyệt (Browser CORS & 302 Redirect):

| Mục kiểm thử | Kết quả thực tế | Ghi chú / Độ trễ đo được |
|---|---|---|
| **Deploy Web App (Anyone)** | `Đạt` | URL Web App đã sẵn sàng và phản hồi HTTP 200 |
| **GET Ping (Token đúng)** | `Đạt` | Độ trễ: 1473 ms (Node) / 1493 ms (Trình duyệt) |
| **POST Ping (Token đúng)** | `Đạt` | Độ trễ: 1260 ms (Node) / 1145 ms (Trình duyệt) |
| **Token sai (Bị từ chối)** | `Đạt` | Nhận mã `ERR_UNAUTHORIZED` (`401`/JSON code) trong ~1017 ms |
| **Xử lý 302 Redirect & CORS** | `Đạt` | Trình duyệt tự động theo redirect 302 sang `script.googleusercontent.com`, 0 lỗi CORS |

> **Kết luận Bước 2:** Hạ tầng kết nối Google Apps Script Web App hoạt động hoàn toàn chính xác, đáp ứng đầy đủ yêu cầu bảo mật Shared Secret Token, giải quyết triệt để vấn đề CORS & 302 Redirect và sẵn sàng để thiết kế kiến trúc đồng bộ ở các bước tiếp theo.

