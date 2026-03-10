/**
 * 请求日志中间件
 * 打印每个请求的方法、路径和响应时间
 */
const logger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const color =
      statusCode >= 500 ? '\x1b[31m' :
      statusCode >= 400 ? '\x1b[33m' :
      '\x1b[32m';
    console.log(`${color}[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} - ${duration}ms\x1b[0m`);
  });

  next();
};

module.exports = logger;
