const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.db;
  const { status, user_id, start_date, end_date, keyword } = req.query;
  let sql = `
    SELECT r.*, u.name as user_name, u.department, a.name as approver_name
    FROM requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.approver_id = a.id
    WHERE 1=1
  `;
  const params = [];
  
  if (req.user.role === 'employee') {
    sql += ' AND r.user_id = ?';
    params.push(req.user.id);
  }
  
  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }
  if (user_id && req.user.role !== 'employee') {
    sql += ' AND r.user_id = ?';
    params.push(user_id);
  }
  if (start_date) {
    sql += ' AND DATE(r.request_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(r.request_time) <= ?';
    params.push(end_date);
  }
  if (keyword) {
    sql += ' AND (r.request_no LIKE ? OR u.name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY r.id DESC';
  
  const requests = db.prepare(sql).all(...params);
  
  const requestIds = requests.map(r => r.id);
  if (requestIds.length > 0) {
    const placeholders = requestIds.map(() => '?').join(',');
    const items = db.prepare(`
      SELECT ri.*, i.name as item_name, i.specification, i.model, i.unit
      FROM request_items ri
      LEFT JOIN items i ON ri.item_id = i.id
      WHERE ri.request_id IN (${placeholders})
    `).all(...requestIds);
    
    const itemsMap = {};
    items.forEach(item => {
      if (!itemsMap[item.request_id]) itemsMap[item.request_id] = [];
      itemsMap[item.request_id].push(item);
    });
    
    requests.forEach(r => {
      r.items = itemsMap[r.id] || [];
    });
  } else {
    requests.forEach(r => {
      r.items = [];
    });
  }
  
  res.json(requests);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.db;
  const request = db.prepare(`
    SELECT r.*, u.name as user_name, u.department, u.position, a.name as approver_name
    FROM requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN users a ON r.approver_id = a.id
    WHERE r.id = ?
  `).get(req.params.id);
  
  if (!request) {
    return res.status(404).json({ message: '申请不存在' });
  }
  
  if (req.user.role === 'employee' && request.user_id !== req.user.id) {
    return res.status(403).json({ message: '无权查看此申请' });
  }
  
  request.items = db.prepare(`
    SELECT ri.*, i.name as item_name, i.specification, i.model, i.unit
    FROM request_items ri
    LEFT JOIN items i ON ri.item_id = i.id
    WHERE ri.request_id = ?
  `).all(request.id);
  
  res.json(request);
});

router.post('/', authMiddleware, (req, res) => {
  const { items, purpose, request_time } = req.body;
  const db = req.db;
  
  const requestNo = 'LY' + Date.now();
  
  const stmt = db.prepare(`
    INSERT INTO requests (request_no, user_id, purpose, request_time, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const result = stmt.run(requestNo, req.user.id, purpose, request_time || new Date().toISOString());
  const requestId = result.lastInsertRowid;
  
  const itemStmt = db.prepare('INSERT INTO request_items (request_id, item_id, quantity) VALUES (?, ?, ?)');
  for (const item of items) {
    itemStmt.run(requestId, item.item_id, item.quantity);
  }
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '提交领用申请', requestNo, JSON.stringify(items));
  
  res.json({ id: requestId, request_no: requestNo, message: '提交成功' });
});

router.put('/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { status, reject_reason } = req.body;
  const db = req.db;
  
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!request) {
    return res.status(404).json({ message: '申请不存在' });
  }
  
  if (request.status !== 'pending') {
    return res.status(400).json({ message: '该申请已处理' });
  }
  
  if (status === 'approved') {
    const items = db.prepare('SELECT * FROM request_items WHERE request_id = ?').all(id);
    for (const item of items) {
      const itemInfo = db.prepare('SELECT stock, name FROM items WHERE id = ?').get(item.item_id);
      if (itemInfo.stock < item.quantity) {
        return res.status(400).json({ message: `物品"${itemInfo.name}"库存不足` });
      }
    }
    
    for (const item of items) {
      const itemInfo = db.prepare('SELECT stock FROM items WHERE id = ?').get(item.item_id);
      const beforeStock = itemInfo.stock;
      const afterStock = beforeStock - item.quantity;
      
      db.prepare('UPDATE items SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterStock, item.item_id);
      
      db.prepare(`
        INSERT INTO inventory_logs (item_id, type, quantity, before_stock, after_stock, operator_id, related_id, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.item_id, 'out', item.quantity, beforeStock, afterStock, req.user.id, id, '领用出库');
    }
  }
  
  db.prepare(`
    UPDATE requests SET status = ?, approver_id = ?, approve_time = CURRENT_TIMESTAMP, reject_reason = ? WHERE id = ?
  `).run(status, req.user.id, reject_reason || null, id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, status === 'approved' ? '批准领用' : '驳回领用', request.request_no, reject_reason || '');
  
  res.json({ message: '审批成功' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = req.db;
  
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!request) {
    return res.status(404).json({ message: '申请不存在' });
  }
  
  if (request.status !== 'pending') {
    return res.status(400).json({ message: '只能撤销待审批的申请' });
  }
  
  if (req.user.role === 'employee' && request.user_id !== req.user.id) {
    return res.status(403).json({ message: '无权撤销此申请' });
  }
  
  db.prepare('DELETE FROM request_items WHERE request_id = ?').run(id);
  db.prepare('DELETE FROM requests WHERE id = ?').run(id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target) VALUES (?, ?, ?)');
  logStmt.run(req.user.id, '撤销领用申请', request.request_no);
  
  res.json({ message: '撤销成功' });
});

module.exports = router;
