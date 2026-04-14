// ╔══════════════════════════════════════════════════╗
// ║  接案管理 — Google Apps Script 後端              ║
// ║  貼到 Apps Script 後按「部署」→「新增部署」      ║
// ╚══════════════════════════════════════════════════╝

const SHEET_PROJECTS = '案件';
const SHEET_TODOS    = '待辦';
const SHEET_CLIENTS  = '客戶';

const PROJECT_HEADERS = ['id','name','client','type','amount','status','due','proposal','revision','invoice','deposit','final','paidDate','notes_json'];
const TODO_HEADERS    = ['id','text','project','due','done'];
const CLIENT_HEADERS  = ['id','name','type','contact'];

// ── 入口 ──────────────────────────────────────────
function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  try {
    const params = e.parameter || {};
    const body   = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    const action = params.action || body.action;
    const result = dispatch(action, params, body);
    return json({ ok: true, data: result });
  } catch(err) {
    return json({ ok: false, error: err.message });
  }
}

function dispatch(action, p, b) {
  switch(action) {
    case 'getAll':      return getAll();
    case 'saveAll':     return saveAll(b);
    case 'ping':        return { pong: true };
    default:            throw new Error('Unknown action: ' + action);
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 讀取全部資料 ──────────────────────────────────
function getAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    projects: sheetToObjects(ss, SHEET_PROJECTS, PROJECT_HEADERS),
    todos:    sheetToObjects(ss, SHEET_TODOS,    TODO_HEADERS),
    clients:  sheetToObjects(ss, SHEET_CLIENTS,  CLIENT_HEADERS),
  };
}

// ── 寫入全部資料 ──────────────────────────────────
function saveAll(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (b.projects !== undefined) objectsToSheet(ss, SHEET_PROJECTS, PROJECT_HEADERS, b.projects);
  if (b.todos    !== undefined) objectsToSheet(ss, SHEET_TODOS,    TODO_HEADERS,    b.todos);
  if (b.clients  !== undefined) objectsToSheet(ss, SHEET_CLIENTS,  CLIENT_HEADERS,  b.clients);
  return { saved: true };
}

// ── 工具函式 ──────────────────────────────────────
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function sheetToObjects(ss, name, headers) {
  const sheet = getOrCreateSheet(ss, name);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const head = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[head.indexOf(h)] ?? '';
      if (h === 'notes_json') { try { val = JSON.parse(val || '[]'); } catch(e) { val = []; } }
      if (h === 'done') val = val === true || val === 'true' || val === 1;
      if (h === 'amount') val = Number(val) || 0;
      if (h === 'id') val = Number(val) || 0;
      obj[h] = val;
    });
    // rename notes_json → notes for app
    if (obj.notes_json !== undefined) { obj.notes = obj.notes_json; delete obj.notes_json; }
    return obj;
  }).filter(o => o.id);
}

function objectsToSheet(ss, name, headers, objects) {
  const sheet = getOrCreateSheet(ss, name);
  sheet.clearContents();
  sheet.appendRow(headers);
  objects.forEach(obj => {
    const row = headers.map(h => {
      if (h === 'notes_json') return JSON.stringify(obj.notes || []);
      const v = obj[h];
      return (v === undefined || v === null) ? '' : v;
    });
    sheet.appendRow(row);
  });
}
