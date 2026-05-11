const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.db;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = 1').get(username);
  if (!user) {
    return res.status(400).json({ message: '用户名或密码错误' });
  }
  
  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(400).json({ message: '用户名或密码错误' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, ip) VALUES (?, ?, ?, ?)');
  logStmt.run(user.id, '登录', '用户登录', req.ip);
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      position: user.position
    }
  });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const db = req.db;
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const isValid = bcrypt.compareSync(oldPassword, user.password);
  if (!isValid) {
    return res.status(400).json({ message: '原密码错误' });
  }
  
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, req.user.id);
  
  res.json({ message: '密码修改成功' });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = req.db;
  const user = db.prepare('SELECT id, username, name, department, position, role, status FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
