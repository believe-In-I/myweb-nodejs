# OSS上传配置说明

## 必需配置值

### 1. 访问凭证
- **accessKeyId**: 从阿里云控制台获取的访问密钥ID
- **accessKeySecret**: 从阿里云控制台获取的访问密钥Secret

### 2. Bucket信息
- **bucket**: OSS存储桶的名称
- **endpoint**: OSS服务器地址，格式为 `https://oss-{region}.aliyuncs.com`

### 3. 区域选择
常见的region和endpoint对应关系：
- 杭州: `https://oss-cn-hangzhou.aliyuncs.com`
- 北京: `https://oss-cn-beijing.aliyuncs.com`
- 上海: `https://oss-cn-shanghai.aliyuncs.com`
- 深圳: `https://oss-cn-shenzhen.aliyuncs.com`
- 香港: `https://oss-cn-hongkong.aliyuncs.com`
- 美国西部: `https://oss-us-west-1.aliyuncs.com`
- 新加坡: `https://oss-ap-southeast-1.aliyuncs.com`

## 获取配置信息的步骤

### 1. 获取访问密钥
1. 登录阿里云控制台
2. 鼠标悬停在右上角头像上，点击"AccessKey管理"
3. 创建或使用已有的AccessKey
4. 记录AccessKeyId和AccessKeySecret

### 2. 获取Bucket信息
1. 进入OSS控制台
2. 选择或创建Bucket
3. 在Bucket概览页面查看：
   - Bucket名称
   - 外网Endpoint（选择与您服务器地理位置最近的）

### 3. 环境变量配置
将配置信息写入 `.env` 文件：
```bash
OSS_ACCESS_KEY_ID=your_actual_access_key_id
OSS_ACCESS_KEY_SECRET=your_actual_access_key_secret
OSS_BUCKET=your_actual_bucket_name
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

## 依赖安装
```bash
npm install ali-oss
```

## 使用方法
```javascript
const { uploadFile, generateSignedUrl } = require('./oss-upload');

// 上传文件
await uploadFile('./local-file.txt', 'uploads/example.txt');

// 生成分享链接
const url = generateSignedUrl('uploads/example.txt');
```

## 权限设置
- **private**: 私有（默认，需要签名URL访问）
- **public-read**: 公共读（可以直接通过URL访问）
- **public-read-write**: 公共读写（不推荐）

## 常见问题
1. **权限错误**: 检查AccessKey权限和Bucket权限设置
2. **网络错误**: 确认endpoint地址正确且网络连通
3. **文件大小限制**: 单个文件最大支持5GB