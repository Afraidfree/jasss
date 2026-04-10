require("dotenv").config();
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Токен відсутній" });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId   = payload.userId;
    req.nickname = payload.nickname;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Токен прострочений", code: "TOKEN_EXPIRED" });
    return res.status(401).json({ error: "Невалідний токен" });
  }
}

module.exports = { requireAuth };
