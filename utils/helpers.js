/**
 * 通用工具函数集合
 */

/**
 * 规范化 OSS 目录路径（确保末尾有 /）
 */
const normalizeDirPath = (path) => {
  if (!path) return '';
  return path.endsWith('/') ? path : `${path}/`;
};

/**
 * 生成带时间戳的 OSS 存储键名
 * @param {string} originalName - 原始文件名
 * @param {string} [prefix='uploads'] - 前缀目录
 */
const generateOssKey = (originalName, prefix = 'uploads') => {
  return `${prefix}/${Date.now()}-${originalName}`;
};

/**
 * 判断值是否为非空字符串
 */
const isNonEmptyString = (val) => typeof val === 'string' && val.trim().length > 0;

module.exports = { normalizeDirPath, generateOssKey, isNonEmptyString };
