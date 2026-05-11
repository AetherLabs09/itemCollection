const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/overview', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE status = 1').get().count;
  const totalStock = db.prepare('SELECT SUM(stock) as total FROM items WHERE status = 1').get().total || 0;
  const warningCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE stock <= min_stock AND status = 1').get().count;
  const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'pending'").get().count;
  const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM users WHERE status = 1').get().count;
  
  res.json({
    totalItems,
    totalStock,
    warningCount,
    pendingRequests,
    totalEmployees
  });
});

router.get('/by-department', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { start_date, end_date } = req.query;
  let sql = `
    SELECT u.department, COUNT(DISTINCT r.id) as request_count, SUM(ri.quantity) as total_quantity
    FROM requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN request_items ri ON r.id = ri.request_id
    WHERE r.status = 'approved'
  `;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(r.request_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(r.request_time) <= ?';
    params.push(end_date);
  }
  sql += ' GROUP BY u.department ORDER BY total_quantity DESC';
  
  const stats = db.prepare(sql).all(...params);
  res.json(stats);
});

router.get('/by-item', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { start_date, end_date, limit } = req.query;
  let sql = `
    SELECT i.id, i.name, i.specification, i.model, i.unit, 
           COUNT(DISTINCT r.id) as request_count, SUM(ri.quantity) as total_quantity
    FROM request_items ri
    LEFT JOIN requests r ON ri.request_id = r.id
    LEFT JOIN items i ON ri.item_id = i.id
    WHERE r.status = 'approved'
  `;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(r.request_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(r.request_time) <= ?';
    params.push(end_date);
  }
  sql += ' GROUP BY i.id ORDER BY total_quantity DESC';
  
  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  const stats = db.prepare(sql).all(...params);
  res.json(stats);
});

router.get('/by-time', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { start_date, end_date, group_by } = req.query;
  
  let dateFormat = '%Y-%m-%d';
  if (group_by === 'month') {
    dateFormat = '%Y-%m';
  } else if (group_by === 'year') {
    dateFormat = '%Y';
  }
  
  let sql = `
    SELECT strftime('${dateFormat}', r.request_time) as time, 
           COUNT(DISTINCT r.id) as request_count, SUM(ri.quantity) as total_quantity
    FROM requests r
    LEFT JOIN request_items ri ON r.id = ri.request_id
    WHERE r.status = 'approved'
  `;
  const params = [];
  
  if (start_date) {
    sql += ' AND DATE(r.request_time) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND DATE(r.request_time) <= ?';
    params.push(end_date);
  }
  sql += ` GROUP BY time ORDER BY time`;
  
  const stats = db.prepare(sql).all(...params);
  res.json(stats);
});

router.get('/export', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { start_date, end_date, type } = req.query;
  
  let data = [];
  
  if (type === 'department') {
    let sql = `
      SELECT u.department as 部门, COUNT(DISTINCT r.id) as 领用次数, SUM(ri.quantity) as 领用数量
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN request_items ri ON r.id = ri.request_id
      WHERE r.status = 'approved'
    `;
    const params = [];
    if (start_date) {
      sql += ' AND DATE(r.request_time) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(r.request_time) <= ?';
      params.push(end_date);
    }
    sql += ' GROUP BY u.department ORDER BY 领用数量 DESC';
    data = db.prepare(sql).all(...params);
  } else if (type === 'item') {
    let sql = `
      SELECT i.name as 物品名称, i.specification as 规格, i.model as 型号, i.unit as 单位,
             COUNT(DISTINCT r.id) as 领用次数, SUM(ri.quantity) as 领用数量
      FROM request_items ri
      LEFT JOIN requests r ON ri.request_id = r.id
      LEFT JOIN items i ON ri.item_id = i.id
      WHERE r.status = 'approved'
    `;
    const params = [];
    if (start_date) {
      sql += ' AND DATE(r.request_time) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(r.request_time) <= ?';
      params.push(end_date);
    }
    sql += ' GROUP BY i.id ORDER BY 领用数量 DESC';
    data = db.prepare(sql).all(...params);
  }
  
  res.json(data);
});

module.exports = router;
