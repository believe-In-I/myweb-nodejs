# myweb-nodejs

Node.js 后端服务，提供阿里云 OSS 文件管理 API 和 AI 聊天 API（DeepSeek / Ollama）。

## 项目结构

```
myweb-nodejs/
├── server.js              # 入口文件
├── package.json
├── .env.example           # 环境变量模板
├── oss-config.env         # 实际配置文件（不提交到版本控制）
├── routes/
│   ├── ossRoutes.js       # OSS 文件管理路由
│   └── aiRoutes.js        # AI 聊天路由
├── utils/
│   ├── ossClient.js       # OSS 客户端单例
│   ├── response.js        # 统一响应格式
│   └── helpers.js         # 通用工具函数
└── middleware/
    ├── logger.js          # 请求日志
    ├── errorHandler.js    # 全局错误处理
    └── requireOss.js      # OSS 配置检查
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制模板文件并填入实际配置：

```bash
copy .env.example oss-config.env
```

编辑 `oss-config.env`，填写以下必要配置：

| 变量名 | 是否必填 | 说明 |
|--------|----------|------|
| `PORT` | 否 | 服务端口，默认 `3001` |
| `OSS_ACCESS_KEY_ID` | 是 | 阿里云 AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 是 | 阿里云 AccessKey Secret |
| `OSS_BUCKET` | 是 | OSS Bucket 名称 |
| `OSS_ENDPOINT` | 是 | OSS Endpoint 地址 |
| `OSS_REGION` | 否 | 区域标识 |
| `OSS_CNAME` | 否 | 自定义域名 |
| `DEEPSEEK_API_KEY` | 是（AI功能） | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | 否 | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | 否 | 默认模型，默认 `deepseek-chat` |
| `OLLAMA_BASE_URL` | 否 | Ollama 服务地址 |
| `OLLAMA_API_KEY` | 否 | Ollama 云端 API Key |
| `OLLAMA_DEFAULT_MODEL` | 否 | 默认模型，默认 `llama3.1:8b` |

### 3. 启动服务

```bash
# 生产模式
npm start

# 开发模式（热重载，需安装 nodemon）
npm run dev
```

服务启动后默认监听 `http://localhost:3001`。

---

## API 文档

### 健康检查

```
GET /api/health
```

**响应示例：**
```json
{
  "status": "ok",
  "message": "OSS上传服务运行中",
  "ossConfigured": true
}
```

---

### OSS 文件管理

#### 上传文件

```
POST /api/oss/upload
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | 要上传的文件 |
| `key` | string | 否 | 自定义存储路径，默认 `uploads/{timestamp}-{filename}` |
| `acl` | string | 否 | 访问权限，默认 `public-read` |
| `contentType` | string | 否 | MIME 类型 |

#### 获取文件列表

```
GET /api/oss/list?prefix=uploads/&delimiter=/
```

#### 删除文件

```
DELETE /api/oss/delete
Content-Type: application/json

{ "key": "uploads/example.png" }
```

#### 获取下载链接

```
GET /api/oss/download-url?key=uploads/example.png
```

链接有效期 1 小时。

#### 创建目录

```
POST /api/oss/create-dir
Content-Type: application/json

{ "dirName": "photos", "parentPath": "uploads/" }
```

#### 删除目录

```
DELETE /api/oss/delete-dir
Content-Type: application/json

{ "key": "uploads/photos/" }
```

---

### AI 聊天

#### DeepSeek 聊天（流式）

```
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "你好" }
  ]
}
```

响应为 SSE 流式输出：
```
data: {"content":"你好"}
data: [DONE]
```

#### Ollama 聊天（流式）

```
POST /api/ai/chat-ollama
Content-Type: application/json

{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "llama3.1:8b"
}
```

---

## OSS Endpoint 参考

| 地区 | Endpoint |
|------|----------|
| 杭州 | `https://oss-cn-hangzhou.aliyuncs.com` |
| 北京 | `https://oss-cn-beijing.aliyuncs.com` |
| 上海 | `https://oss-cn-shanghai.aliyuncs.com` |
| 深圳 | `https://oss-cn-shenzhen.aliyuncs.com` |
| 香港 | `https://oss-cn-hongkong.aliyuncs.com` |
| 新加坡 | `https://oss-ap-southeast-1.aliyuncs.com` |
| 美国西部 | `https://oss-us-west-1.aliyuncs.com` |

## 常见问题

1. **OSS 权限错误** — 检查 AccessKey 对应 RAM 用户是否有 OSS 读写权限
2. **网络错误** — 确认 `OSS_ENDPOINT` 地址正确，且服务器能访问阿里云
3. **AI 接口 503** — 检查 `DEEPSEEK_API_KEY` 是否配置正确
4. **文件大小限制** — multer 默认无限制，OSS 单文件最大 5 GB
