const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载环境变量
const envPath = path.join(__dirname, 'oss-config.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化 OSS 客户端
const ossClient = require('./utils/ossClient');
ossClient.init();

// Middleware
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

app.use(cors({
  origin: 'https://niumashuai.top',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// 挂载路由
const ossRoutes = require('./routes/ossRoutes');
const aiRoutes = require('./routes/aiRoutes');

app.use('/api', ossRoutes);
app.use('/api/ai', aiRoutes);

// 全局错误处理（必须放在路由之后）
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 OSS上传服务运行在 http://localhost:${PORT}`);
  console.log(`📡 文件上传API: POST http://localhost:${PORT}/api/oss/upload`);
  console.log(`📡 文件列表API: GET http://localhost:${PORT}/api/oss/list`);
  console.log(`📡 文件删除API: DELETE http://localhost:${PORT}/api/oss/delete`);
  console.log(`📡 下载链接API: GET http://localhost:${PORT}/api/oss/download-url`);
  console.log(`📡 创建目录API: POST http://localhost:${PORT}/api/oss/create-dir`);
  console.log(`📡 删除目录API: DELETE http://localhost:${PORT}/api/oss/delete-dir`);
  console.log(`📡 健康检查API: GET http://localhost:${PORT}/api/health`);
  console.log(`📡 AI聊天API: POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`\nPress Ctrl+C to stop the server`);
});
