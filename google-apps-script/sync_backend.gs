/**
 * Google Apps Script Sync Engine — KentoPrice (QL_ThuChi)
 * Phiên bản: Bước 3 (Sync Contract & Snapshot Sync Engine)
 *
 * CÁC TÍNH NĂNG CHÍNH:
 * 1. Xác thực Shared Secret Token an toàn từ Script Properties ('SHARED_SECRET_TOKEN').
 * 2. action 'ping': Kiểm tra kết nối & đo độ trễ round-trip.
 * 3. action 'init_sheets': Tự động tạo 5 tab Sheet (Transactions, Categories, Funds, FundMonthlyConfigs, Sync_Meta)
 *    kèm định dạng Header màu sắc sang trọng và cố định hàng đầu tiên (freeze row 1).
 * 4. action 'push_snapshot': Đẩy toàn bộ dữ liệu từ IndexedDB (Schema v2) lên ghi đè theo lô (Batch setValues).
 * 5. action 'pull_snapshot': Đọc toàn bộ dữ liệu từ các sheet, ánh xạ thành JSON chuẩn BackupDataV2.
 * 6. action 'get_meta': Đọc nhanh số lượng bản ghi và mốc thời gian đồng bộ gần nhất.
 */

var SECRET_KEY_NAME = 'SHARED_SECRET_TOKEN';

// Định nghĩa cấu trúc các Sheet và danh sách cột chuẩn
var SHEET_SCHEMAS = {
  Transactions: [
    'id', 'type', 'amount', 'categoryId', 'transactionDate', 'note', 'fundId', 'createdAt', 'updatedAt'
  ],
  Categories: [
    'id', 'name', 'type', 'icon', 'color', 'isDefault', 'isArchived', 'order', 'createdAt'
  ],
  Funds: [
    'id', 'name', 'icon', 'color', 'isArchived', 'order', 'defaultBudget', 'defaultMode', 'createdAt', 'updatedAt'
  ],
  FundMonthlyConfigs: [
    'id', 'fundId', 'yearMonth', 'monthlyBudget', 'budgetMode', 'updatedAt'
  ],
  Sync_Meta: [
    'key', 'value', 'updatedAt'
  ]
};

/**
 * Xử lý HTTP GET (chủ yếu phục vụ ping kiểm tra nhanh)
 */
function doGet(e) {
  return handleRequest(e ? e.parameter : {}, 'GET');
}

/**
 * Xử lý HTTP POST (Nhận payload JSON text/plain)
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
        message: 'Payload POST không phải là JSON hợp lệ: ' + err.toString(),
      }, 400);
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }
  return handleRequest(params, 'POST');
}

/**
 * Điều phối xử lý yêu cầu chính
 */
function handleRequest(params, method) {
  var action = params.action;
  var providedToken = params.token;
  var expectedToken = PropertiesService.getScriptProperties().getProperty(SECRET_KEY_NAME);

  // 1. Kiểm tra cấu hình bảo mật trên Script Properties
  if (!expectedToken) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_SERVER_MISCONFIGURED',
      message: 'Chưa cấu hình SHARED_SECRET_TOKEN trong Script Properties của Google Apps Script.',
    });
  }

  // 2. Xác thực Secret Token
  if (!providedToken || providedToken !== expectedToken) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_UNAUTHORIZED',
      message: 'Token xác thực không hợp lệ hoặc bị thiếu.',
    });
  }

  // 3. Phân luồng xử lý các Action
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_NO_SPREADSHEET',
      message: 'Không tìm thấy Google Spreadsheet liên kết với tập lệnh này.',
    });
  }

  try {
    switch (action) {
      case 'ping':
        return handlePing(params, method);

      case 'init_sheets':
        return handleInitSheets(ss);

      case 'push_snapshot':
        return handlePushSnapshot(ss, params.data, params.meta);

      case 'pull_snapshot':
        return handlePullSnapshot(ss);

      case 'get_meta':
        return handleGetMeta(ss);

      default:
        return createJsonResponse({
          ok: false,
          code: 'ERR_UNKNOWN_ACTION',
          message: 'Action "' + action + '" không được hỗ trợ trong phiên bản hiện tại.',
        });
    }
  } catch (err) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_INTERNAL_EXECUTION',
      message: 'Lỗi thực thi tập lệnh: ' + err.toString(),
      stack: err.stack || null,
    }, 500);
  }
}

/**
 * Action: ping
 */
function handlePing(params, method) {
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

/**
 * Action: init_sheets
 * Tạo các Sheet nếu chưa có, format Header đẹp mắt và cố định hàng đầu tiên
 */
function handleInitSheets(ss) {
  var sheetNames = Object.keys(SHEET_SCHEMAS);
  var created = [];

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = ss.getSheetByName(name);
    var isNew = false;

    if (!sheet) {
      sheet = ss.insertSheet(name);
      isNew = true;
      created.push(name);
    }

    // Đảm bảo hàng Header có đầy đủ cột theo schema
    var headers = SHEET_SCHEMAS[name];
    var currentLastRow = sheet.getLastRow();
    
    if (currentLastRow === 0) {
      // Sheet hoàn toàn trống -> Ghi header mới
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaderRow(sheet, headers.length);
    }
  }

  // Xóa tab mặc định "Sheet1" hoặc "Trang tính1" nếu trống và đã tạo đủ các tab
  var defaultSheets = ['Sheet1', 'Trang tính1'];
  for (var d = 0; d < defaultSheets.length; d++) {
    var defSheet = ss.getSheetByName(defaultSheets[d]);
    if (defSheet && ss.getSheets().length > 1 && defSheet.getLastRow() === 0) {
      try {
        ss.deleteSheet(defSheet);
      } catch (e) {
        // Bỏ qua nếu là sheet duy nhất
      }
    }
  }

  // Khởi tạo metadata ban đầu
  setMetaKey(ss, 'schema_version', '2');
  setMetaKey(ss, 'app_name', 'QL_ThuChi');
  setMetaKey(ss, 'initialized_at', new Date().toISOString());

  return createJsonResponse({
    ok: true,
    action: 'init_sheets',
    createdSheets: created,
    totalSheets: sheetNames,
    message: 'Khởi tạo cấu trúc các bảng tính thành công.',
  });
}

/**
 * Action: push_snapshot
 * Ghi đè toàn bộ dữ liệu từ Client vào các Sheet (Batch Write)
 */
function handlePushSnapshot(ss, data, meta) {
  if (!data) {
    return createJsonResponse({
      ok: false,
      code: 'ERR_EMPTY_PAYLOAD',
      message: 'Thiếu dữ liệu (data) trong payload push_snapshot',
    });
  }

  // Đảm bảo các sheet đã được khởi tạo
  handleInitSheets(ss);

  var txns = data.transactions || [];
  var cats = data.categories || [];
  var funds = data.funds || [];
  var configs = data.fundMonthlyConfigs || [];

  // 1. Ghi Sheet Transactions
  writeTableData(ss, 'Transactions', SHEET_SCHEMAS.Transactions, txns.map(function(t) {
    return [
      t.id || '',
      t.type || 'expense',
      typeof t.amount === 'number' ? t.amount : Number(t.amount) || 0,
      t.categoryId || '',
      t.transactionDate || '',
      t.note || '',
      t.fundId || '',
      t.createdAt || '',
      t.updatedAt || ''
    ];
  }));

  // 2. Ghi Sheet Categories
  writeTableData(ss, 'Categories', SHEET_SCHEMAS.Categories, cats.map(function(c) {
    return [
      c.id || '',
      c.name || '',
      c.type || 'expense',
      c.icon || '',
      c.color || '',
      Boolean(c.isDefault),
      Boolean(c.isArchived),
      typeof c.order === 'number' ? c.order : Number(c.order) || 0,
      c.createdAt || ''
    ];
  }));

  // 3. Ghi Sheet Funds
  writeTableData(ss, 'Funds', SHEET_SCHEMAS.Funds, funds.map(function(f) {
    return [
      f.id || '',
      f.name || '',
      f.icon || '',
      f.color || '',
      Boolean(f.isArchived),
      typeof f.order === 'number' ? f.order : Number(f.order) || 0,
      typeof f.defaultBudget === 'number' ? f.defaultBudget : Number(f.defaultBudget) || 0,
      f.defaultMode || 'rollover',
      f.createdAt || '',
      f.updatedAt || ''
    ];
  }));

  // 4. Ghi Sheet FundMonthlyConfigs
  writeTableData(ss, 'FundMonthlyConfigs', SHEET_SCHEMAS.FundMonthlyConfigs, configs.map(function(cfg) {
    return [
      cfg.id || '',
      cfg.fundId || '',
      cfg.yearMonth || '',
      typeof cfg.monthlyBudget === 'number' ? cfg.monthlyBudget : Number(cfg.monthlyBudget) || 0,
      cfg.budgetMode || 'rollover',
      cfg.updatedAt || ''
    ];
  }));

  // 5. Cập nhật Metadata đồng bộ
  var syncedAt = new Date().toISOString();
  setMetaKey(ss, 'last_snapshot_at', syncedAt);
  if (meta && meta.device) {
    setMetaKey(ss, 'last_synced_device', meta.device);
  }

  return createJsonResponse({
    ok: true,
    action: 'push_snapshot',
    counts: {
      transactions: txns.length,
      categories: cats.length,
      funds: funds.length,
      fundMonthlyConfigs: configs.length,
    },
    syncedAt: syncedAt,
    message: 'Đồng bộ snapshot toàn bộ dữ liệu lên Google Sheets thành công.',
  });
}

/**
 * Action: pull_snapshot
 * Đọc toàn bộ dữ liệu từ 4 Sheet và trả về định dạng chuẩn BackupDataV2
 */
function handlePullSnapshot(ss) {
  var txns = readTableData(ss, 'Transactions', function(row) {
    return {
      id: String(row[0] || ''),
      type: row[1] === 'income' ? 'income' : 'expense',
      amount: Number(row[2]) || 0,
      categoryId: String(row[3] || ''),
      transactionDate: String(row[4] || ''),
      note: row[5] ? String(row[5]) : undefined,
      fundId: row[6] ? String(row[6]) : undefined,
      createdAt: String(row[7] || ''),
      updatedAt: String(row[8] || ''),
    };
  });

  var cats = readTableData(ss, 'Categories', function(row) {
    return {
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      type: row[2] === 'income' ? 'income' : 'expense',
      icon: String(row[3] || 'Tag'),
      color: String(row[4] || '#64748B'),
      isDefault: parseBool(row[5]),
      isArchived: parseBool(row[6]),
      order: Number(row[7]) || 0,
      createdAt: String(row[8] || ''),
    };
  });

  var funds = readTableData(ss, 'Funds', function(row) {
    return {
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      icon: String(row[2] || 'Wallet'),
      color: String(row[3] || '#3B82F6'),
      isArchived: parseBool(row[4]),
      order: Number(row[5]) || 0,
      defaultBudget: Number(row[6]) || 0,
      defaultMode: row[7] === 'reset' ? 'reset' : 'rollover',
      createdAt: String(row[8] || ''),
      updatedAt: String(row[9] || ''),
    };
  });

  var configs = readTableData(ss, 'FundMonthlyConfigs', function(row) {
    return {
      id: String(row[0] || ''),
      fundId: String(row[1] || ''),
      yearMonth: String(row[2] || ''),
      monthlyBudget: Number(row[3]) || 0,
      budgetMode: row[4] === 'reset' ? 'reset' : 'rollover',
      updatedAt: String(row[5] || ''),
    };
  });

  return createJsonResponse({
    ok: true,
    action: 'pull_snapshot',
    data: {
      transactions: txns,
      categories: cats,
      funds: funds,
      fundMonthlyConfigs: configs,
    },
    counts: {
      transactions: txns.length,
      categories: cats.length,
      funds: funds.length,
      fundMonthlyConfigs: configs.length,
    },
    pulledAt: new Date().toISOString(),
    message: 'Tải dữ liệu từ Google Sheets thành công.',
  });
}

/**
 * Action: get_meta
 * Lấy thông tin tóm tắt số lượng bản ghi và mốc sync cuối
 */
function handleGetMeta(ss) {
  var countTransactions = getRowCount(ss, 'Transactions');
  var countCategories = getRowCount(ss, 'Categories');
  var countFunds = getRowCount(ss, 'Funds');
  var countMonthlyConfigs = getRowCount(ss, 'FundMonthlyConfigs');
  var lastSyncedAt = getMetaKey(ss, 'last_snapshot_at');

  return createJsonResponse({
    ok: true,
    action: 'get_meta',
    counts: {
      transactions: countTransactions,
      categories: countCategories,
      funds: countFunds,
      fundMonthlyConfigs: countMonthlyConfigs,
    },
    lastSyncedAt: lastSyncedAt,
    schemaVersion: 2,
  });
}

// ==========================================
// CÁC HÀM TIỆN ÍCH HỖ TRỢ TRUY XUẤT SHEET
// ==========================================

function formatHeaderRow(sheet, colCount) {
  var range = sheet.getRange(1, 1, 1, colCount);
  range.setBackground('#1E293B'); // Xanh slate đậm sang trọng
  range.setFontColor('#FFFFFF');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  range.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
}

function writeTableData(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Đảm bảo Header luôn có
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  // Xóa toàn bộ dữ liệu cũ từ dòng 2 trở xuống
  var lastRow = sheet.getLastRow();
  var maxCols = Math.max(sheet.getLastColumn(), headers.length);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, maxCols).clearContent();
  }

  // Nếu có dữ liệu mới -> Ghi theo lô (Batch)
  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function readTableData(ss, sheetName, mapperFn) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var results = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    // Bỏ qua dòng trống không có id
    if (row[0] && String(row[0]).trim() !== '') {
      results.push(mapperFn(row));
    }
  }

  return results;
}

function getRowCount(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  var lr = sheet.getLastRow();
  return lr > 1 ? lr - 1 : 0;
}

function setMetaKey(ss, key, value) {
  var sheet = ss.getSheetByName('Sync_Meta');
  if (!sheet) {
    sheet = ss.insertSheet('Sync_Meta');
    sheet.getRange(1, 1, 1, 3).setValues([SHEET_SCHEMAS.Sync_Meta]);
    formatHeaderRow(sheet, 3);
  }

  var now = new Date().toISOString();
  var lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sheet.getRange(i + 2, 2, 1, 2).setValues([[value, now]]);
        return;
      }
    }
  }

  // Nếu key chưa có -> Thêm dòng mới
  sheet.appendRow([key, value, now]);
}

function getMetaKey(ss, key) {
  var sheet = ss.getSheetByName('Sync_Meta');
  if (!sheet) return null;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

function parseBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    var s = val.trim().toLowerCase();
    return s === 'true' || s === '1';
  }
  if (typeof val === 'number') return val === 1;
  return false;
}

function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
