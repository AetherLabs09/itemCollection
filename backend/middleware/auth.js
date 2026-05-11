const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'item-management-secret-key';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'token无效' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'warehouse') {
    return res.status(403).json({ message: '无权限' });
  }
  next();
}

function warehouseMiddleware(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'warehouse') {
    return res.status(403).json({ message: '无权限' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware, warehouseMiddleware, JWT_SECRET };
