/**
 * OSS 配置检查中间件
 * 用于需要 OSS 功能的路由，若未配置则提前返回错误
 */
const { isReady } = require('../utils/ossClient');

const requireOss = (req, res, next) => {
  if (!isReady()) {
    return res.status(503).json({
      status: 'error',
      message: 'OSS 服务未配置或初始化失败，请检查环境变量'
    });
  }
  next();
};

module.exports = requireOss;
