const SHEETS = {
  auth: '00_Auth_Users',
  settings: '01_Settings',
  products: '02_Products',
  customers: '06_Customers',
  orders: '07_Orders',
  coupons: '11_Coupons',
  campaigns: '12_Campaigns',
  payments: '13_Payments',
  tracking: '15_Tracking',
  expenses: '16_Expenses',
  salesReports: '17_Sales_Report',
};

const SHEET_HEADERS = {
  auth: ['identifier', 'passwordHash', 'role', 'name', 'active', 'createdAt', 'updatedAt'],
  settings: ['inside', 'outside', 'threshold', 'freeShippingEnabled', 'freeShippingItems', 'freeShippingCampaignOnly', 'insideEta', 'outsideEta', 'payments', 'coupons', 'campaigns'],
  products: ['id', 'name', 'category', 'costPrice', 'price', 'originalPrice', 'discount', 'discountPercent', 'stock', 'image', 'video', 'description', 'rating', 'reviews', 'colors', 'sizes', 'featured', 'newArrival', 'bestSeller'],
  customers: ['name', 'phone', 'email', 'password', 'district', 'area', 'address', 'postal', 'addresses', 'createdAt', 'updatedAt'],
  orders: ['name', 'phone', 'email', 'district', 'area', 'address', 'postal', 'items', 'payment', 'subtotal', 'productDiscount', 'shipping', 'couponDiscount', 'total', 'free', 'estimated', 'number', 'date', 'status', 'paymentStatus', 'step', 'courier', 'trackingNumber', 'trackingUrl'],
  coupons: ['code', 'type', 'value', 'min', 'active'],
  campaigns: ['id', 'title', 'description', 'image', 'token', 'categories', 'products', 'discountType', 'discountValue', 'freeShipping', 'freeProductId', 'active', 'startDate', 'endDate', 'createdAt', 'updatedAt'],
  payments: ['orderNumber', 'method', 'amount', 'status', 'transactionId', 'phone', 'createdAt', 'updatedAt'],
  tracking: ['orderNumber', 'number', 'status', 'step', 'courier', 'trackingNumber', 'trackingUrl', 'createdAt', 'updatedAt'],
  expenses: ['category', 'amount', 'description', 'date'],
  salesReports: ['number', 'date', 'name', 'phone', 'subtotal', 'shipping', 'total', 'payment', 'status', 'items', 'createdAt'],
};

function setupAuthSheet() {
  const sheet = getSheet_('auth');
  const headers = SHEET_HEADERS.auth;
  if (sheet.getLastRow() >= 2) return '00_Auth_Users already contains users; no data was overwritten.';
  if (!sheet.getLastRow()) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const now = new Date().toISOString();
  // Temporary fixed admin seed. Change this row later from 00_Auth_Users.
  const identifier = 'zakirhossan97@gmail.com';
  const passwordHash = '7f9470af58312fade4dfed4f6f58faf1c7f1de55fec957b4059fd3b67261a360';
  sheet.getRange(2, 1, 1, headers.length).setValues([[identifier, passwordHash, 'admin', 'Administrator', true, now, now]]);
  formatSheet_(sheet, headers.length);
  return '00_Auth_Users created and admin seeded.';
}

function setupDatabase() {
  Object.keys(SHEETS).forEach(function (key) {
    const sheet = getSheet_(key);
    if (!sheet.getLastRow()) {
      const headers = SHEET_HEADERS[key] || [];
      if (headers.length) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatSheet_(sheet, headers.length);
    }
  });
  setupAuthSheet();
  return 'ZiyanaShop database schema is ready.';
}

function doGet() { return json_(readDatabase_()); }

function doPost(event) {
  let body;
  try { body = JSON.parse(event.postData.contents || '{}'); }
  catch (error) { return json_({ ok: false, error: 'Invalid JSON body' }); }
  if (body.action === 'authenticate') return json_(authenticate_(body.identifier, body.password));
  if (body.token !== PropertiesService.getScriptProperties().getProperty('API_TOKEN')) return json_({ ok: false, error: 'Unauthorized' });
  if (!Object.prototype.hasOwnProperty.call(SHEETS, body.key) || body.key === 'auth') return json_({ ok: false, error: 'Unsupported data key' });
  try { writeValue_(body.key, body.value); }
  catch (error) { return json_({ ok: false, error: String(error.message || error) }); }
  return json_({ ok: true, key: body.key });
}

function authenticate_(identifier, password) {
  const normalized = String(identifier || '').trim().toLowerCase();
  if (!normalized || !password) return { ok: false, error: 'Email/phone or password is incorrect.' };
  const authSheet = getSheet_('auth');
  if (!authSheet.getLastRow()) setupAuthSheet();
  let rows = readValue_(authSheet, true);
  let user = rows.find(function (row) {
    return String(row.identifier || '').trim().toLowerCase() === normalized && String(row.active).toLowerCase() !== 'false';
  });
  if (!user) {
    const customers = readValue_(getSheet_('customers'), true);
    const customer = customers.find(function (row) {
      return String(row.email || '').trim().toLowerCase() === normalized || String(row.phone || '').trim() === String(identifier || '').trim();
    });
    if (customer && customer.password && String(customer.password) === String(password)) {
      const now = new Date().toISOString();
      user = { identifier: String(customer.email || customer.phone || normalized).trim().toLowerCase(), passwordHash: hashPassword_(password), role: 'user', name: customer.name || 'Customer', active: true, createdAt: customer.createdAt || now, updatedAt: now };
      appendRecord_('auth', user);
    }
  }
  if (!user || String(user.passwordHash || '') !== hashPassword_(password)) return { ok: false, error: 'Email/phone or password is incorrect.' };
  const role = String(user.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
  let profile = { identifier: user.identifier, name: user.name || 'Customer', role };
  if (role === 'user') {
    const customers = readValue_(getSheet_('customers'), true);
    const customer = customers.find(function (row) {
      return String(row.email || '').trim().toLowerCase() === normalized || String(row.phone || '').trim() === String(identifier || '').trim();
    });
    if (customer) profile = Object.assign({}, customer, { identifier: user.identifier, role: 'user' });
  }
  return { ok: true, user: profile };
}

function hashPassword_(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  return bytes.map(function (byte) { const value = byte < 0 ? byte + 256 : byte; return ('0' + value.toString(16)).slice(-2); }).join('');
}

function readDatabase_() {
  const result = {};
  Object.keys(SHEETS).forEach(function (key) {
    if (key === 'auth') return;
    const sheet = getSheet_(key);
    const legacy = readLegacyValue_(sheet);
    if (legacy.found) { result[key] = key === 'settings' ? legacy.value : toArray_(legacy.value); writeValue_(key, result[key]); }
    else {
      result[key] = readValue_(sheet, key !== 'settings');
      if (!sheet.getLastRow() || !sheet.getLastColumn()) { const headers = SHEET_HEADERS[key] || []; if (headers.length) sheet.getRange(1, 1, 1, headers.length).setValues([headers]); formatSheet_(sheet, headers.length); }
    }
  });
  return result;
}

function migrateExistingSheets() {
  const data = {};
  Object.keys(SHEETS).filter(function (key) { return key !== 'auth' && key !== 'campaigns' && key !== 'salesReports'; }).forEach(function (key) {
    const sheet = getSheet_(key); const legacy = readLegacyValue_(sheet); data[key] = legacy.found ? legacy.value : readValue_(sheet, key !== 'settings');
  });
  const orders = toArray_(data.orders);
  data.customers = mergeRecords_(toArray_(data.customers).concat(orders.map(function (order) { return { name: order.name, phone: order.phone, email: order.email || '', district: order.district, area: order.area, address: order.address, postal: order.postal, updatedAt: order.date }; })), ['phone', 'email']);
  data.payments = mergeRecords_(toArray_(data.payments).concat(orders.map(function (order) { return { orderNumber: order.number, method: order.payment || 'cod', amount: order.total, status: order.paymentStatus || 'Pending', createdAt: order.date }; })), ['orderNumber']);
  data.tracking = mergeRecords_(toArray_(data.tracking).concat(orders.map(function (order) { return { orderNumber: order.number, number: order.number, status: order.status, step: order.step || 0, courier: order.courier || '', trackingNumber: order.trackingNumber || '', trackingUrl: order.trackingUrl || '', createdAt: order.date }; })), ['orderNumber', 'number']);
  Object.keys(data).forEach(function (key) { writeValue_(key, key === 'settings' ? data[key] : toArray_(data[key])); });
}
function migrateSheetsToTables() { migrateExistingSheets(); return 'Legacy data migrated. 12_Campaigns and 17_Sales_Report are kept separate.'; }
function appendRecord_(key, record) { const sheet = getSheet_(key); writeValue_(key, readValue_(sheet, true).concat([record])); }
function writeValue_(key, value) {
  const sheet = getSheet_(key); const rows = Array.isArray(value) ? value : [value]; const records = rows.filter(function (row) { return row !== null && row !== undefined && typeof row === 'object'; });
  const headers = uniqueHeaders_((SHEET_HEADERS[key] || []).concat(collectHeaders_(records))); const table = [headers].concat(records.map(function (record) { return headers.map(function (header) { return toCellValue_(record[header]); }); }));
  sheet.clearContents();
  if (table.length && headers.length) {
    const dataRange = sheet.getRange(1, 1, table.length, headers.length); const headerRange = sheet.getRange(1, 1, 1, headers.length);
    dataRange.setValues(table).setVerticalAlignment('middle').setWrap(false); sheet.setFrozenRows(1); sheet.setRowHeight(1, 28); if (table.length > 1) sheet.setRowHeights(2, table.length - 1, 21);
    headerRange.setFontWeight('bold').setBackground('#1e2925').setFontColor('#ffffff'); const existingFilter = sheet.getFilter(); if (existingFilter) existingFilter.remove(); dataRange.createFilter(); sheet.autoResizeColumns(1, headers.length);
  }
}
function formatSheet_(sheet, columnCount) { if (!columnCount) return; sheet.getRange(1, 1, 1, columnCount).setFontWeight('bold').setBackground('#1e2925').setFontColor('#ffffff'); sheet.setFrozenRows(1); sheet.autoResizeColumns(1, columnCount); }
function uniqueHeaders_(headers) { const seen = {}; return headers.filter(function (header) { if (!header || seen[header]) return false; seen[header] = true; return true; }); }
function mergeRecords_(records, identityFields) { const result = []; const indexes = {}; records.forEach(function (record) { if (!record || typeof record !== 'object') return; const identity = identityFields.map(function (field) { return String(record[field] || '').trim(); }).filter(Boolean).join('|'); if (!identity) return; if (indexes[identity] === undefined) { indexes[identity] = result.length; result.push(record); } else result[indexes[identity]] = Object.assign({}, result[indexes[identity]], record); }); return result; }
function readValue_(sheet, expectArray) { const lastRow = sheet.getLastRow(); const lastColumn = sheet.getLastColumn(); if (!lastRow || !lastColumn) return expectArray ? [] : null; const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues(); if (lastRow === 1 && lastColumn === 1 && typeof values[0][0] === 'string') { try { return JSON.parse(values[0][0]); } catch (error) { return values[0][0]; } } const headers = values[0].map(function (header) { return String(header || '').trim(); }); const records = values.slice(1).filter(function (row) { return row.some(function (cell) { return cell !== '' && cell !== null; }); }).map(function (row) { const record = {}; headers.forEach(function (header, index) { if (header) record[header] = fromCellValue_(row[index]); }); return record; }); return expectArray ? records : records[0] || null; }
function readLegacyValue_(sheet) { const raw = sheet.getRange('A1').getValue(); if (typeof raw !== 'string' || !raw.trim()) return { found: false, value: null }; try { const value = JSON.parse(raw); if (value && typeof value === 'object') return { found: true, value: value }; } catch (error) { return { found: false, value: null }; } return { found: false, value: null }; }
function toArray_(value) { return Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []; }
function collectHeaders_(records) { const seen = {}; records.forEach(function (record) { Object.keys(record).forEach(function (key) { seen[key] = true; }); }); return Object.keys(seen); }
function toCellValue_(value) { if (value === null || value === undefined) return ''; if (typeof value === 'object') return JSON.stringify(value); return value; }
function fromCellValue_(value) { if (typeof value !== 'string') return value; const text = value.trim(); if (!text) return ''; try { return JSON.parse(text); } catch (error) { return value; } }
function getSheet_(key) { const name = SHEETS[key]; const spreadsheet = SpreadsheetApp.getActiveSpreadsheet(); return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
