const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/system', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  res.json(result);
});

router.post('/system', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const settings = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value);
  }
  
  const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)');
  logStmt.run(req.user.id, '修改系统设置', '系统设置', JSON.stringify(settings));
  
  res.json({ message: '保存成功' });
});

router.get('/logs', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const { user_id, action, start_date, end_date, keyword } = req.query;
  let sql = `
    SELECT l.*, u.name as user_name
    FROM operation_logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (user_id) {
    sql += ' AND l.user_id = ?';
    params.push(user_id);
  }
  if (action) {
    sql += ' AND l.action LIKE ?';
    params.push(`%${action}%`);
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
    sql += ' AND (l.target LIKE ? OR l.detail LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY l.id DESC';
  
  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

router.post('/backup', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.db;
  const backupDir = path.join(__dirname, '../../db/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
  
  db.backup(backupPath)
    .then(() => {
      const logStmt = db.prepare('INSERT INTO operation_logs (user_id, action, target) VALUES (?, ?, ?)');
      logStmt.run(req.user.id, '数据备份', backupPath);
      res.json({ message: '备份成功', path: backupPath });
    })
    .catch(err => {
      res.status(500).json({ message: '备份失败', error: err.message });
    });
});

router.get('/backups', authMiddleware, adminMiddleware, (req, res) => {
  const backupDir = path.join(__dirname, '../../db/backups');
  if (!fs.existsSync(backupDir)) {
    return res.json([]);
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        size: stat.size,
        created_at: stat.mtime
      };
    })
    .sort((a, b) => b.created_at - a.created_at);
  
  res.json(files);
});

module.exports = router;
