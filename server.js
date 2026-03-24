const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');

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
  origin: ['https://niumashuai.top', 'http://localhost:5173','http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// 挂载路由
const ossRoutes = require('./routes/ossRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { initWebSocket } = require('./routes/WebSocket');



// /** */

// // 音频参数配置
// const config = {
//   durationHours: 3,          // 时长（小时）
//   sampleRate: 44100,         // 采样率 44.1kHz（标准）
//   channels: 1,               // 单声道（改为2就是立体声）
//   bitDepth: 16,              // 16bit 位深
//   outputFile: 'test_3h_silent.wav' // 输出文件名
// };

// // 计算核心参数
// const totalSeconds = config.durationHours * 60 * 60;
// const totalSamples = config.sampleRate * totalSeconds;
// const bytesPerSample = config.bitDepth / 8;
// const blockAlign = config.channels * bytesPerSample;
// const byteRate = config.sampleRate * blockAlign;
// const dataSize = totalSamples * blockAlign;
// const fileSize = 44 + dataSize; // WAV头44字节 + 数据区

// // 构建WAV文件头（固定格式，不懂也不影响使用）
// const wavHeader = Buffer.alloc(44);
// wavHeader.write('RIFF', 0);                // ChunkID
// wavHeader.writeUInt32LE(fileSize - 8, 4);  // ChunkSize
// wavHeader.write('WAVE', 8);                // Format
// wavHeader.write('fmt ', 12);               // Subchunk1ID
// wavHeader.writeUInt32LE(16, 16);           // Subchunk1Size (PCM格式固定16)
// wavHeader.writeUInt16LE(1, 20);            // AudioFormat (1=PCM)
// wavHeader.writeUInt16LE(config.channels, 22); // NumChannels
// wavHeader.writeUInt32LE(config.sampleRate, 24); // SampleRate
// wavHeader.writeUInt32LE(byteRate, 28);     // ByteRate
// wavHeader.writeUInt16LE(blockAlign, 32);   // BlockAlign
// wavHeader.writeUInt16LE(config.bitDepth, 34); // BitsPerSample
// wavHeader.write('data', 36);               // Subchunk2ID
// wavHeader.writeUInt32LE(dataSize, 40);     // Subchunk2Size

// // 生成静音数据（16bit静音值为0）
// const silentSample = Buffer.alloc(bytesPerSample, 0);
// const silentData = Buffer.alloc(dataSize);
// // 批量填充静音数据（避免循环百万次，提升效率）
// const fillChunk = Buffer.alloc(4096, 0); // 4KB填充块
// let remaining = dataSize;
// let offset = 0;
// while (remaining > 0) {
//   const writeSize = Math.min(remaining, fillChunk.length);
//   fillChunk.copy(silentData, offset, 0, writeSize);
//   offset += writeSize;
//   remaining -= writeSize;
// }

// // 合并头和数据，写入文件
// const wavFile = Buffer.concat([wavHeader, silentData]);
// fs.writeFileSync(config.outputFile, wavFile);

// console.log(`✅ 生成成功！文件：${config.outputFile}`);
// console.log(`📊 信息：${config.durationHours}小时 / ${config.sampleRate}Hz / ${config.bitDepth}bit / ${config.channels}声道`);

// /** */



app.use('/api', ossRoutes);
app.use('/api/ai', aiRoutes);

// 全局错误处理（必须放在路由之后）
app.use(errorHandler);

// 创建 HTTP 服务器并初始化 WebSocket
const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 OSS上传服务运行在 http://localhost:${PORT}`);
  console.log(`📡 文件上传API: POST http://localhost:${PORT}/api/oss/upload`);
  console.log(`📡 文件列表API: GET http://localhost:${PORT}/api/oss/list`);
  console.log(`📡 文件删除API: DELETE http://localhost:${PORT}/api/oss/delete`);
  console.log(`📡 下载链接API: GET http://localhost:${PORT}/api/oss/download-url`);
  console.log(`📡 创建目录API: POST http://localhost:${PORT}/api/oss/create-dir`);
  console.log(`📡 删除目录API: DELETE http://localhost:${PORT}/api/oss/delete-dir`);
  console.log(`📡 健康检查API: GET http://localhost:${PORT}/api/health`);
  console.log(`📡 AI聊天API: POST http://localhost:${PORT}/api/ai/chat`);
  console.log(`📡 聊天WebSocket: ws://localhost:${PORT}/ws/chat`);
  console.log(`\nPress Ctrl+C to stop the server`);
});
