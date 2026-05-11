const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.db;
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json(categories);
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { name, sort_order } = req.body;
  const db = req.db;
  
  const stmt = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  const result = stmt.run(name, sort_order || 0);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '新增分类', name, JSON.stringify(req.body));
  
  res.json({ id: result.lastInsertRowid, name, sort_order: sort_order || 0 });
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, sort_order } = req.body;
  const db = req.db;
  
  db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(name, sort_order, id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '编辑分类', name, JSON.stringify(req.body));
  
  res.json({ message: '更新成功' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const db = req.db;
  
  const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(id);
  const items = db.prepare('SELECT COUNT(*) as count FROM items WHERE category_id = ?').get(id);
  
  if (items.count > 0) {
    return res.status(400).json({ message: '该分类下有物品，无法删除' });
  }
  
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target) VALUES (?, ?, ?)');
  logStmt.run(req.user.id, '删除分类', category?.name || id);
  
  res.json({ message: '删除成功' });
});

module.exports = router;
