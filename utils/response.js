/**
 * 统一 API 响应格式工具
 */

const success = (res, data = null, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const error = (res, message = '操作失败', statusCode = 500, err = null) => {
  const body = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };
  if (err && process.env.NODE_ENV !== 'production') {
    body.error = err.message || String(err);
  }
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
