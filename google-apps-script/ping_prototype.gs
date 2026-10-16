/**
 * Google Apps Script Prototype — Action "ping" (Diagnostic / Archival)
 *
 * LƯU Ý HỆ THỐNG:
 * Tập lệnh chính thức (Production) cho toàn bộ tính năng đồng bộ 2 chiều (Push/Pull Snapshot,
 * Quản lý Quỹ, Danh mục, Giao dịch) là `sync_backend.gs`.
 * Tệp này được lưu trữ phục vụ việc test chẩn đoán ping độc lập.
 *
 * Mục đích ban đầu:
 * Kiểm chứng hạ tầng kết nối Web App, xử lý 302 Redirect của Google, CORS,
 * kiểm tra Shared Secret Token và đo đạc độ trễ (latency) trước khi chuyển dữ liệu.
 *
 * QUY TẮC AN TOÀN:
 * 1. Không hardcode token vào mã nguồn.
 * 2. Đọc token từ Script Properties: PropertiesService.getScriptProperties().getProperty('SHARED_SECRET_TOKEN').
 * 3. Chỉ trả về ContentService dạng JSON.
 */

// Cấu hình tên Property lưu Shared Secret
var SECRET_KEY_NAME = 'SHARED_SECRET_TOKEN';

/**
 * Xử lý HTTP GET
 * Thử nghiệm kiểm tra ping nhanh qua URL query parameters:
 * ?action=ping&token=YOUR_TEST_TOKEN
 */
function doGet(e) {
  return handleRequest(e ? e.parameter : {}, 'GET');
}

/**
 * Xử lý HTTP POST
 * Nhận payload dạng JSON trong postData.contents:
 * { "action": "ping", "token": "YOUR_TEST_TOKEN", "clientTimestamp": 1728556800000 }
 */
function doPost(e) {
  var params = {};
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      return createJsonResponse({
        ok: false,
        code: 'ERR_INVALID_JSON',
        message: 'Payload POST không phải là JSON hợp lệ',
      }, 400);
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleRequest(params, 'POST');
}

/**
 * Hàm điều phối chính
 */
function handleRequest(params, method) {
  var action = params.action;
  var providedToken = params.token;

  // Lấy Shared Secret đã cấu hình trong Script Properties
  var expectedToken = PropertiesService.getScriptProperties().getProperty(SECRET_KEY_NAME);

  // 1. Kiểm tra cấu hình hệ thống
  if (!expectedToken) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_SERVER_MISCONFIGURED',
      message: 'Chưa cấu hình SHARED_SECRET_TOKEN trong Script Properties của Google Apps Script.',
    });
  }

  // 2. Xác thực Shared Secret Token
  if (!providedToken || providedToken !== expectedToken) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_UNAUTHORIZED',
      message: 'Token xác thực không hợp lệ hoặc bị thiếu.',
    });
  }

  // 3. Xử lý Action 'ping'
  if (action === 'ping') {
    var serverTime = new Date().toISOString();
    return createJsonResponse({
      ok: true,
      action: 'ping',
      method: method,
      serverTime: serverTime,
      clientTimestamp: params.clientTimestamp || null,
      message: 'Pong! Kết nối Google Apps Script thành công.',
    });
  }

  // 4. Action không hỗ trợ
  return createJsonResponse({
    ok: false,
    code: 'ERR_UNKNOWN_ACTION',
    message: 'Action "' + action + '" chưa được hỗ trợ trong phiên bản prototype.',
  });
}

/**
 * Tạo phản hồi JSON chuẩn MIME type
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
