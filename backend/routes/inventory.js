const express = require('express');
const router = express.Router();
const { authMiddleware, warehouseMiddleware } = require('../middleware/auth');

router.post('/in', authMiddleware, warehouseMiddleware, (req, res) => {
  const { item_id, quantity, type, remark } = req.body;
  const db = req.db;
  
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }
  
  const beforeStock = item.stock;
  const afterStock = beforeStock + quantity;
  
  db.prepare('UPDATE items SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterStock, item_id);
  
  db.prepare(`
    INSERT INTO inventory_logs (item_id, type, quantity, before_stock, after_stock, operator_id, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item_id, type || 'in', quantity, beforeStock, afterStock, req.user.id, remark || '入库');
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '入库', item.name, `入库${quantity}${item.unit}`);
  
  res.json({ message: '入库成功', after_stock: afterStock });
});

router.post('/return', authMiddleware, warehouseMiddleware, (req, res) => {
  const { item_id, quantity, remark } = req.body;
  const db = req.db;
  
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }
  
  const beforeStock = item.stock;
  const afterStock = beforeStock + quantity;
  
  db.prepare('UPDATE items SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(afterStock, item_id);
  
  db.prepare(`
    INSERT INTO inventory_logs (item_id, type, quantity, before_stock, after_stock, operator_id, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(item_id, 'return', quantity, beforeStock, afterStock, req.user.id, remark || '归还入库');
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '归还入库', item.name, `归还${quantity}${item.unit}`);
  
  res.json({ message: '归还成功', after_stock: afterStock });
});

router.get('/logs', authMiddleware, (req, res) => {
  const db = req.db;
  const { item_id, type, start_date, end_date, keyword } = req.query;
  let sql = `
    SELECT l.*, i.name as item_name, i.specification, i.model, i.unit, u.name as operator_name
    FROM inventory_logs l
    LEFT JOIN items i ON l.item_id = i.id
    LEFT JOIN users u ON l.operator_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (item_id) {
    sql += ' AND l.item_id = ?';
    params.push(item_id);
  }
  if (type) {
    sql += ' AND l.type = ?';
    params.push(type);
  }
  if (start_date) {
    sql += ' AND DATE(l.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(l.created_at) <= ?';
    params.push(end_date);
  }
  if (keyword) {
    sql += ' AND i.name LIKE ?';
    params.push(`%${keyword}%`);
  }
  sql += ' ORDER BY l.id DESC';
  
  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

router.get('/logs/export', authMiddleware, (req, res) => {
  const db = req.db;
  const { start_date, end_date } = req.query;
  let sql = `
    SELECT l.created_at as 时间, i.name as 物品名称, i.specification as 规格, i.model as 型号,
           l.type as 类型, l.quantity as 数量, i.unit as 单位, 
           l.before_stock as 变动前库存, l.after_stock as 变动后库存,
           u.name as 操作人, l.remark as 备注
    FROM inventory_logs l
    LEFT JOIN items i ON l.item_id = i.id
    LEFT JOIN users u ON l.operator_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(l.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(l.created_at) <= ?';
    params.push(end_date);
  }
  sql += ' ORDER BY l.id DESC';
  
  const logs = db.prepare(sql).all(...params);
  
  const typeMap = {
    'in': '采购入库',
    'out': '领用出库',
    'return': '归还入库',
    'adjust_in': '调整增加',
    'adjust_out': '调整减少'
  };
  logs.forEach(log => {
    log.类型 = typeMap[log.类型] || log.类型;
  });
  
  res.json(logs);
});

module.exports = router;
