const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, warehouseMiddleware } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads/items');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/', authMiddleware, (req, res) => {
  const db = req.db;
  const { category_id, keyword, status } = req.query;
  let sql = `SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE 1=1`;
  const params = [];
  
  if (category_id) {
    sql += ' AND i.category_id = ?';
    params.push(category_id);
  }
  if (keyword) {
    sql += ' AND (i.name LIKE ? OR i.specification LIKE ? OR i.model LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') {
    sql += ' AND i.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY i.id DESC';
  
  const items = db.prepare(sql).all(...params);
  res.json(items);
});

router.get('/warning', authMiddleware, (req, res) => {
  const db = req.db;
  const items = db.prepare(`
    SELECT i.*, c.name as category_name 
    FROM items i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.stock <= i.min_stock AND i.status = 1
  `).all();
  res.json(items);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.db;
  const item = db.prepare(`
    SELECT i.*, c.name as category_name 
    FROM items i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.id = ?
  `).get(req.params.id);
  
  if (!item) {
    return res.status(404).json({ message: '物品不存在' });
  }
  res.json(item);
});

router.post('/', authMiddleware, warehouseMiddleware, upload.single('image'), (req, res) => {
  const db = req.db;
  const { name, category_id, specification, model, unit, stock, min_stock, location } = req.body;
  const image = req.file ? `/uploads/items/${req.file.filename}` : null;
  
  const stmt = db.prepare(`
    INSERT INTO items (name, category_id, specification, model, unit, stock, min_stock, location, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, category_id || null, specification, model, unit, stock || 0, min_stock || 0, location, image);
  
  if (stock > 0) {
    db.prepare(`
      INSERT INTO inventory_logs (item_id, type, quantity, before_stock, after_stock, operator_id, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, 'in', stock, 0, stock, req.user.id, '初始入库');
  }
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '新增物品', name, JSON.stringify(req.body));
  
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

router.put('/:id', authMiddleware, warehouseMiddleware, upload.single('image'), (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { name, category_id, specification, model, unit, min_stock, location, status } = req.body;
  
  const oldItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  let image = oldItem.image;
  if (req.file) {
    image = `/uploads/items/${req.file.filename}`;
    if (oldItem.image && fs.existsSync(path.join(__dirname, '..', oldItem.image))) {
      fs.unlinkSync(path.join(__dirname, '..', oldItem.image));
    }
  }
  
  db.prepare(`
    UPDATE items SET name = ?, category_id = ?, specification = ?, model = ?, unit = ?, min_stock = ?, location = ?, image = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(name, category_id || null, specification, model, unit, min_stock || 0, location, image, status, id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '编辑物品', name, JSON.stringify(req.body));
  
  res.json({ message: '更新成功' });
});

router.put('/:id/stock', authMiddleware, warehouseMiddleware, (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { stock, remark } = req.body;
  
  const oldItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  const beforeStock = oldItem.stock;
  const diff = stock - beforeStock;
  
  db.prepare('UPDATE items SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stock, id);
  
  if (diff !== 0) {
    db.prepare(`
      INSERT INTO inventory_logs (item_id, type, quantity, before_stock, after_stock, operator_id, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, diff > 0 ? 'adjust_in' : 'adjust_out', Math.abs(diff), beforeStock, stock, req.user.id, remark || '库存调整');
  }
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '调整库存', oldItem.name, `从${beforeStock}调整为${stock}`);
  
  res.json({ message: '库存更新成功' });
});

router.delete('/:id', authMiddleware, warehouseMiddleware, (req, res) => {
  const db = req.db;
  const { id } = req.params;
  
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (item.image && fs.existsSync(path.join(__dirname, '..', item.image))) {
    fs.unlinkSync(path.join(__dirname, '..', item.image));
  }
  
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target) VALUES (?, ?, ?)');
  logStmt.run(req.user.id, '删除物品', item.name);
  
  res.json({ message: '删除成功' });
});

module.exports = router;
