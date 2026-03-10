/**
 * OSS 客户端单例工厂
 * 统一管理 ali-oss 客户端实例及配置检查
 */

const OSS = require('ali-oss');

let ossClient = null;
let isConfigured = false;

const requiredKeys = [
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
  'OSS_BUCKET',
  'OSS_ENDPOINT'
];

const init = () => {
  const missing = requiredKeys.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`⚠️  OSS配置不完整，缺少: ${missing.join(', ')}。OSS功能将不可用`);
    return;
  }

  try {
    ossClient = new OSS({
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
      endpoint: process.env.OSS_ENDPOINT,
      region: process.env.OSS_REGION,
      cname: !!process.env.OSS_CNAME
    });
    isConfigured = true;
    console.log('✅ OSS客户端初始化成功');
  } catch (err) {
    console.error('❌ OSS客户端初始化失败:', err.message);
  }
};

const getClient = () => ossClient;
const isReady = () => isConfigured;

module.exports = { init, getClient, isReady };
