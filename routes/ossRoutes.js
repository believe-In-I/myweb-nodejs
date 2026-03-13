const express = require('express');
const multer = require('multer');
const { getClient } = require('../utils/ossClient');
const requireOss = require('../middleware/requireOss');

const router = express.Router();

// 允许的图片 MIME 类型
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
];

// 文件过滤器：只允许图片
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`只允许上传图片文件，当前文件类型: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  }
});

// 1. 健康检查
router.get('/health', (req, res) => {
  const { isReady } = require('../utils/ossClient');
  res.json({
    status: 'ok',
    message: 'OSS上传服务运行中',
    timestamp: new Date().toISOString(),
    ossConfigured: isReady()
  });
});

// 2. 文件上传到OSS
router.post('/oss/upload', requireOss, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: '请选择要上传的文件' });
    }

    const file = req.file;
    const ossKey = req.body.key || `uploads/${Date.now()}-${file.originalname}`;
    const acl = req.body.acl || 'public-read';
    const contentType = req.body.contentType || file.mimetype;

    const result = await getClient().put(ossKey, file.buffer, { acl, contentType });

    res.json({
      status: 'success',
      message: '文件上传成功',
      data: {
        key: result.name,
        url: result.url,
        size: file.size,
        contentType,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    // 处理 multer 错误
    if (error.message && error.message.includes('只允许上传图片文件')) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'error', message: '文件大小不能超过 10MB' });
    }
    res.status(500).json({ status: 'error', message: '文件上传失败', error: error.message });
  }
});

// 3. 获取OSS文件列表
router.get('/oss/list', requireOss, async (req, res) => {
  try {
    const prefix = req.query.prefix || 'uploads/';
    const delimiter = req.query.delimiter || '/';

    const result = await getClient().list({ prefix, delimiter, 'max-keys': 100 });

    const files = (result.objects || []).map(item => ({
      key: item.name,
      url: getClient().signatureUrl(item.name),
      size: item.size,
      lastModified: item.lastModified,
      contentType: item.contentType
    }));

    const directories = (result.prefixes || []).map(p => ({
      key: p,
      name: p.replace(delimiter, '').replace(prefix, '')
    }));

    res.json({
      status: 'success',
      message: '获取文件列表成功',
      data: { files, directories, prefix }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '获取文件列表失败', error: error.message });
  }
});

// 4. 删除OSS文件
router.delete('/oss/delete', requireOss, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ status: 'error', message: '请提供要删除的文件路径 (key)' });
    }

    await getClient().delete(key);

    res.json({ status: 'success', message: '文件删除成功', data: { key } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '文件删除失败', error: error.message });
  }
});

// 5. 获取OSS文件下载链接
router.get('/oss/download-url', requireOss, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ status: 'error', message: '请提供文件路径 (key)' });
    }

    const url = getClient().signatureUrl(key, { expires: 3600 });

    res.json({ status: 'success', message: '获取下载链接成功', data: { key, url } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '获取下载链接失败', error: error.message });
  }
});

// 6. 创建目录
router.post('/oss/create-dir', requireOss, async (req, res) => {
  try {
    const { dirName, parentPath } = req.body;
    if (!dirName) {
      return res.status(400).json({ status: 'error', message: '请提供目录名称 (dirName)' });
    }

    const dirPath = parentPath
      ? `${parentPath.replace(/\/$/, '')}/${dirName}/`
      : `uploads/${dirName}/`;

    await getClient().put(dirPath, Buffer.from(''), { contentType: 'application/directory' });

    res.json({ status: 'success', message: '目录创建成功', data: { key: dirPath, name: dirName } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '目录创建失败', error: error.message });
  }
});

// 7. 删除目录
router.delete('/oss/delete-dir', requireOss, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ status: 'error', message: '请提供目录路径 (key)' });
    }

    const dirPath = key.endsWith('/') ? key : `${key}/`;

    const result = await getClient().list({ prefix: dirPath, 'max-keys': 1000 });

    if (result.objects && result.objects.length > 0) {
      await getClient().deleteMulti(result.objects.map(item => ({ name: item.name })));
    }

    res.json({
      status: 'success',
      message: '目录删除成功',
      data: { key: dirPath, deletedCount: result.objects ? result.objects.length : 0 }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '目录删除失败', error: error.message });
  }
});

module.exports = router;
