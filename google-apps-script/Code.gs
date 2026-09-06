const SHEETS = {
  settings: '01_Settings',
  products: '02_Products',
  customers: '06_Customers',
  orders: '07_Orders',
  coupons: '11_Coupons',
  payments: '13_Payments',
  tracking: '15_Tracking',
  expenses: '16_Expenses',
  campaigns: '17_Sales_Report',
};

const SHEET_HEADERS = {
  settings: ['inside', 'outside', 'threshold', 'freeShippingEnabled', 'freeShippingItems', 'freeShippingCampaignOnly', 'insideEta', 'outsideEta', 'payments', 'coupons', 'campaigns'],
  products: ['id', 'name', 'category', 'costPrice', 'price', 'originalPrice', 'discount', 'discountPercent', 'stock', 'image', 'video', 'description', 'rating', 'reviews', 'colors', 'sizes', 'featured', 'newArrival', 'bestSeller'],
  customers: ['name', 'phone', 'email', 'password', 'district', 'area', 'address', 'postal', 'addresses', 'createdAt', 'updatedAt'],
  orders: ['name', 'phone', 'email', 'district', 'area', 'address', 'postal', 'items', 'payment', 'subtotal', 'productDiscount', 'shipping', 'couponDiscount', 'total', 'free', 'estimated', 'number', 'date', 'status', 'paymentStatus', 'step', 'courier', 'trackingNumber', 'trackingUrl'],
  coupons: ['code', 'type', 'value', 'min', 'active'],
  payments: ['orderNumber', 'method', 'amount', 'status', 'transactionId', 'phone', 'createdAt', 'updatedAt'],
  tracking: ['orderNumber', 'number', 'status', 'step', 'courier', 'trackingNumber', 'trackingUrl', 'createdAt', 'updatedAt'],
  expenses: ['category', 'amount', 'description', 'date'],
  campaigns: ['number', 'date', 'name', 'phone', 'subtotal', 'shipping', 'total', 'payment', 'status', 'items', 'createdAt'],
};

function doGet() {
  return json_(readDatabase_());
}

function doPost(event) {
  let body;
  try {
    body = JSON.parse(event.postData.contents || '{}');
  } catch (error) {
    return json_({ ok: false, error: 'Invalid JSON body' });
  }
  if (body.token !== PropertiesService.getScriptProperties().getProperty('API_TOKEN')) {
    return json_({ ok: false, error: 'Unauthorized' });
  }
  if (!Object.prototype.hasOwnProperty.call(SHEETS, body.key)) {
    return json_({ ok: false, error: 'Unsupported data key' });
  }
  try {
    writeValue_(body.key, body.value);
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
  return json_({ ok: true, key: body.key });
}

function readDatabase_() {
  const result = {};
  Object.keys(SHEETS).forEach(function (key) {
    const sheet = getSheet_(key);
    const legacy = readLegacyValue_(sheet);
    if (legacy.found) {
      result[key] = key === 'settings' ? legacy.value : toArray_(legacy.value);
      writeValue_(key, result[key]);
    } else {
      result[key] = readValue_(sheet, key !== 'settings');
      if (!sheet.getLastRow() || !sheet.getLastColumn()) writeValue_(key, result[key]);
    }
  });
  return result;
}

function migrateExistingSheets() {
  const data = {};
  Object.keys(SHEETS).forEach(function (key) {
    const sheet = getSheet_(key);
    const legacy = readLegacyValue_(sheet);
    data[key] = legacy.found ? legacy.value : readValue_(sheet, key !== 'settings');
  });

  const orders = toArray_(data.orders);
  data.customers = mergeRecords_(toArray_(data.customers).concat(orders.map(function (order) {
    return { name: order.name, phone: order.phone, email: order.email || '', district: order.district, area: order.area, address: order.address, postal: order.postal, updatedAt: order.date };
  })), ['phone', 'email']);
  data.payments = mergeRecords_(toArray_(data.payments).concat(orders.map(function (order) {
    return { orderNumber: order.number, method: order.payment || 'cod', amount: order.total, status: order.paymentStatus || 'Pending', createdAt: order.date };
  })), ['orderNumber']);
  data.tracking = mergeRecords_(toArray_(data.tracking).concat(orders.map(function (order) {
    return { orderNumber: order.number, number: order.number, status: order.status, step: order.step || 0, courier: order.courier || '', trackingNumber: order.trackingNumber || '', trackingUrl: order.trackingUrl || '', createdAt: order.date };
  })), ['orderNumber', 'number']);
  data.campaigns = mergeRecords_(toArray_(data.campaigns).concat(orders.map(function (order) {
    return { number: order.number, date: order.date, name: order.name, phone: order.phone, subtotal: order.subtotal, shipping: order.shipping, total: order.total, payment: order.payment, status: order.status, items: order.items, createdAt: order.date };
  })), ['number']);

  Object.keys(SHEETS).forEach(function (key) {
    writeValue_(key, key === 'settings' ? data[key] : toArray_(data[key]));
  });
}

function migrateSheetsToTables() {
  migrateExistingSheets();
}

function writeValue_(key, value) {
  const sheet = getSheet_(key);
  const rows = Array.isArray(value) ? value : [value];
  const records = rows.filter(function (row) {
    return row !== null && row !== undefined && typeof row === 'object';
  });
  const headers = uniqueHeaders_((SHEET_HEADERS[key] || []).concat(collectHeaders_(records)));
  const table = [headers].concat(records.map(function (record) {
    return headers.map(function (header) {
      return toCellValue_(record[header]);
    });
  }));

  sheet.clearContents();
  if (table.length && headers.length) {
    const dataRange = sheet.getRange(1, 1, table.length, headers.length);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    dataRange.setValues(table).setVerticalAlignment('middle').setWrap(false);
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 28);
    if (table.length > 1) sheet.setRowHeights(2, table.length - 1, 21);
    headerRange.setFontWeight('bold').setBackground('#1e2925').setFontColor('#ffffff');
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();
    dataRange.createFilter();
    sheet.autoResizeColumns(1, headers.length);
  }
}

function uniqueHeaders_(headers) {
  const seen = {};
  return headers.filter(function (header) {
    if (!header || seen[header]) return false;
    seen[header] = true;
    return true;
  });
}

function mergeRecords_(records, identityFields) {
  const result = [];
  const indexes = {};
  records.forEach(function (record) {
    if (!record || typeof record !== 'object') return;
    const identity = identityFields.map(function (field) { return String(record[field] || '').trim(); }).filter(Boolean).join('|');
    if (!identity) return;
    if (indexes[identity] === undefined) {
      indexes[identity] = result.length;
      result.push(record);
    } else {
      result[indexes[identity]] = Object.assign({}, result[indexes[identity]], record);
    }
  });
  return result;
}

function readValue_(sheet, expectArray) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (!lastRow || !lastColumn) return expectArray ? [] : null;

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  if (lastRow === 1 && lastColumn === 1 && typeof values[0][0] === 'string') {
    try {
      return JSON.parse(values[0][0]);
    } catch (error) {
      return values[0][0];
    }
  }

  const headers = values[0].map(function (header) { return String(header || '').trim(); });
  const records = values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== '' && cell !== null; });
  }).map(function (row) {
    const record = {};
    headers.forEach(function (header, index) {
      if (header) record[header] = fromCellValue_(row[index]);
    });
    return record;
  });
  return expectArray ? records : records[0] || null;
}

function readLegacyValue_(sheet) {
  const raw = sheet.getRange('A1').getValue();
  if (typeof raw !== 'string' || !raw.trim()) return { found: false, value: null };
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object') return { found: true, value: value };
  } catch (error) {
    return { found: false, value: null };
  }
  return { found: false, value: null };
}

function toArray_(value) {
  return Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
}

function collectHeaders_(records) {
  const seen = {};
  records.forEach(function (record) {
    Object.keys(record).forEach(function (key) { seen[key] = true; });
  });
  return Object.keys(seen);
}

function toCellValue_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function fromCellValue_(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch (error) {
    return value;
  }
}

function getSheet_(key) {
  const name = SHEETS[key];
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
