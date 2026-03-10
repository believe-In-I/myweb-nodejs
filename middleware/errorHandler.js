/**
 * 全局错误处理中间件
 * 必须作为最后一个 app.use() 注册（参数为 err, req, res, next）
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('❌ 未捕获错误:', err.message);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
