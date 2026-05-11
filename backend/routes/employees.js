const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { keyword, department, status } = req.query;
  let sql = 'SELECT id, username, name, department, position, role, status, created_at FROM users WHERE 1=1';
  const params = [];
  
  if (keyword) {
    sql += ' AND (name LIKE ? OR username LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (status !== undefined && status !== '') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC';
  
  const employees = db.prepare(sql).all(...params);
  res.json(employees);
});

router.get('/departments', authMiddleware, (req, res) => {
  const db = req.db;
  const departments = db.prepare('SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != ""').all();
  res.json(departments.map(d => d.department));
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, name, department, position, role } = req.body;
  const db = req.db;
  
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password || '123456', 10);
  const stmt = db.prepare(`
    INSERT INTO users (username, password, name, department, position, role, status)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  const result = stmt.run(username, hashedPassword, name, department, position, role || 'employee');
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '新增员工', name, JSON.stringify(req.body));
  
  res.json({ id: result.lastInsertRowid, message: '添加成功' });
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, department, position, role, password } = req.body;
  const db = req.db;
  
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare(`
      UPDATE users SET name = ?, department = ?, position = ?, role = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(name, department, position, role, hashedPassword, id);
  } else {
    db.prepare(`
      UPDATE users SET name = ?, department = ?, position = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(name, department, position, role, id);
  }
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '编辑员工', name, JSON.stringify(req.body));
  
  res.json({ message: '更新成功' });
});

router.put('/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = req.db;
  
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id);
  db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, status === 1 ? '启用账号' : '禁用账号', user?.name, `状态改为${status}`);
  
  res.json({ message: '状态更新成功' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const db = req.db;
  
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: '不能删除自己的账号' });
  }
  
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target) VALUES (?, ?, ?)');
  logStmt.run(req.user.id, '删除员工', user?.name);
  
  res.json({ message: '删除成功' });
});

module.exports = router;
