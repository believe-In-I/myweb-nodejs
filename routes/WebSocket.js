const WebSocket = require('ws');
const url = require('url');
const path = require('path');
const fs = require('fs');

// 在线用户列表 { ws: WebSocket, userId: string, username: string, avatar: string }
const clients = new Map();

// 消息类型枚举
const MessageType = {
  TEXT: 'text',           // 文本消息
  EMOJI: 'emoji',         // 表情消息
  IMAGE: 'image',         // 图片消息
  VIDEO: 'video',         // 视频消息
  FILE: 'file',           // 文件消息
  VOICE: 'voice',         // 语音消息
  SYSTEM: 'system',       // 系统消息
  USER_LIST: 'userList',  // 用户列表更新
  PRIVATE: 'private',     // 私聊消息
  PING: 'ping',           // 心跳检测
  PONG: 'pong',           // 心跳响应
  HISTORY: 'history'      // 服务端推送：最近聊天记录
};

/** 最近聊天消息（供新连接同步，不含系统进出提示） */
const MAX_MESSAGE_HISTORY = 200;
const messageHistory = [];

function rememberChatMessage(msg) {
  try {
    const snapshot = JSON.parse(JSON.stringify(msg));
    messageHistory.push(snapshot);
    while (messageHistory.length > MAX_MESSAGE_HISTORY) {
      messageHistory.shift();
    }
  } catch (e) {
    console.error('记录聊天历史失败:', e.message);
  }
}

// 初始化 WebSocket 服务器
function initWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws/chat'
  });

  console.log('📡 WebSocket 聊天服务已启动，路径: /ws/chat');

  // 连接处理
  wss.on('connection', (ws, req) => {
    const queryParams = url.parse(req.url, true).query;
    const userId = queryParams.userId || `user_${Date.now()}`;
    const username = queryParams.username || `访客${Math.floor(Math.random() * 1000)}`;
    const avatar = queryParams.avatar || '';

    // 存储客户端信息
    const clientInfo = {
      ws,
      userId,
      username,
      avatar,
      joinTime: Date.now()
    };
    clients.set(ws, clientInfo);

    console.log(`👤 用户加入: ${username} (${userId}), 当前在线: ${clients.size}`);

    // 广播用户列表更新
    broadcastUserList();

    // 发送欢迎消息
    const welcomeMsg = createMessage(MessageType.SYSTEM, {
      content: `欢迎 ${username} 加入聊天室！`,
      system: true
    });
    ws.send(JSON.stringify(welcomeMsg));

    // 推送最近聊天记录
    if (messageHistory.length > 0) {
      ws.send(JSON.stringify({
        type: MessageType.HISTORY,
        payload: { messages: messageHistory },
        timestamp: Date.now()
      }));
    }

    // 广播用户加入消息
    broadcast(createMessage(MessageType.SYSTEM, {
      content: `${username} 加入了聊天室`,
      system: true
    }), ws);

    // 消息处理
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('❌ 消息解析失败:', err.message);
        ws.send(JSON.stringify(createMessage(MessageType.SYSTEM, {
          content: '消息格式错误',
          system: true
        })));
      }
    });

    // 离线处理
    ws.on('close', () => {
      const client = clients.get(ws);
      if (client) {
        console.log(`👤 用户离开: ${client.username} (${client.userId}), 当前在线: ${clients.size - 1}`);
        broadcast(createMessage(MessageType.SYSTEM, {
          content: `${client.username} 离开了聊天室`,
          system: true
        }));
        clients.delete(ws);
        broadcastUserList();
      }
    });

    // 错误处理
    ws.on('error', (err) => {
      console.error('❌ WebSocket 错误:', err.message);
    });

    // 心跳检测
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // 心跳检测定时器
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        const client = clients.get(ws);
        if (client) {
          console.log(`💓 移除超时连接: ${client.username}`);
          broadcast(createMessage(MessageType.SYSTEM, {
            content: `${client.username} 连接超时已断开`,
            system: true
          }));
          clients.delete(ws);
        }
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
    broadcastUserList();
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

// 消息处理
function handleMessage(ws, message) {
  const client = clients.get(ws);
  if (!client) return;

  const { type, payload } = message;

  switch (type) {
    case MessageType.TEXT:
      // 文字消息
      handleTextMessage(ws, payload);
      break;

    case MessageType.EMOJI:
      // 表情消息（可携带文字说明）
      handleEmojiMessage(ws, payload);
      break;

    case MessageType.IMAGE:
      // 图片消息
      handleImageMessage(ws, payload);
      break;

    case MessageType.VIDEO:
      // 视频消息
      handleVideoMessage(ws, payload);
      break;

    case MessageType.FILE:
      // 文件消息
      handleFileMessage(ws, payload);
      break;

    case MessageType.VOICE:
      // 语音消息
      handleVoiceMessage(ws, payload);
      break;

    case MessageType.PRIVATE:
      // 私聊消息
      handlePrivateMessage(ws, payload);
      break;

    case MessageType.PING:
      // 心跳检测响应
      ws.send(JSON.stringify(createMessage(MessageType.PONG, {})));
      break;

    default:
      console.warn(`⚠️ 未知消息类型: ${type}`);
  }
}

// 文字消息处理
function handleTextMessage(ws, payload) {
  const client = clients.get(ws);
  const { content } = payload;

  if (!content || content.trim().length === 0) return;

  const chatMessage = createMessage(MessageType.TEXT, {
    content: content.trim(),
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`💬 ${client.username}: ${content.substring(0, 50)}...`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 表情消息处理
function handleEmojiMessage(ws, payload) {
  const client = clients.get(ws);
  const { emojiId, emojiType, description } = payload;

  if (!emojiId) return;

  const chatMessage = createMessage(MessageType.EMOJI, {
    emojiId,
    emojiType: emojiType || 'custom',  // custom: 自定义表情, system: 系统表情
    description: description || '',
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`😊 ${client.username} 发送表情: ${emojiId}`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 图片消息处理
function handleImageMessage(ws, payload) {
  const client = clients.get(ws);
  const { url, thumbnail, width, height, originalName } = payload;

  if (!url) return;

  const chatMessage = createMessage(MessageType.IMAGE, {
    url,
    thumbnail: thumbnail || url,  // 缩略图URL
    width: width || 0,
    height: height || 0,
    originalName: originalName || '图片',
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`🖼️ ${client.username} 发送图片: ${originalName || url}`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 视频消息处理
function handleVideoMessage(ws, payload) {
  const client = clients.get(ws);
  const { url, thumbnail, duration, width, height, originalName } = payload;

  if (!url) return;

  const chatMessage = createMessage(MessageType.VIDEO, {
    url,
    thumbnail: thumbnail || '',
    duration: duration || 0,  // 视频时长（秒）
    width: width || 0,
    height: height || 0,
    originalName: originalName || '视频',
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`🎬 ${client.username} 发送视频: ${originalName || url}`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 文件消息处理
function handleFileMessage(ws, payload) {
  const client = clients.get(ws);
  const { url, fileName, fileSize, fileType, originalName } = payload;

  if (!url || !fileName) return;

  const chatMessage = createMessage(MessageType.FILE, {
    url,
    fileName,
    fileSize: fileSize || 0,
    fileType: fileType || getFileType(fileName),  // application/pdf, application/zip 等
    originalName: originalName || fileName,
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`📎 ${client.username} 发送文件: ${originalName || fileName}`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 语音消息处理
function handleVoiceMessage(ws, payload) {
  const client = clients.get(ws);
  const { url, duration, format } = payload;

  if (!url) return;

  const chatMessage = createMessage(MessageType.VOICE, {
    url,
    duration: duration || 0,  // 语音时长（秒）
    format: format || 'webm', // webm, mp3, wav 等
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    timestamp: Date.now()
  });

  console.log(`🎤 ${client.username} 发送语音: ${duration}s`);
  rememberChatMessage(chatMessage);
  broadcast(chatMessage);
}

// 私聊消息处理
function handlePrivateMessage(ws, payload) {
  const client = clients.get(ws);
  const { targetUserId, content, messageType, ...rest } = payload;

  if (!targetUserId || !content) return;

  // 找到目标用户
  let targetWs = null;
  for (const [wsKey, info] of clients) {
    if (info.userId === targetUserId) {
      targetWs = wsKey;
      break;
    }
  }

  const messageContent = {
    content,
    messageType: messageType || MessageType.TEXT,
    ...rest,
    userId: client.userId,
    username: client.username,
    avatar: client.avatar,
    targetUserId,
    targetUsername: targetWs ? clients.get(targetWs).username : targetUserId,
    isPrivate: true,
    timestamp: Date.now()
  };

  const chatMessage = createMessage(MessageType.PRIVATE, messageContent);

  // 发送给目标用户
  if (targetWs) {
    targetWs.send(JSON.stringify(chatMessage));
    console.log(`📨 ${client.username} -> ${clients.get(targetWs).username}: [私聊] ${content.substring(0, 30)}...`);
  }

  // 发送回给发送者
  ws.send(JSON.stringify(chatMessage));
}

// 广播消息给所有客户端
function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  clients.forEach((client, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// 广播用户列表
function broadcastUserList() {
  const userList = [];
  clients.forEach((client) => {
    userList.push({
      userId: client.userId,
      username: client.username,
      avatar: client.avatar,
      joinTime: client.joinTime
    });
  });

  const message = createMessage(MessageType.USER_LIST, {
    users: userList,
    count: userList.length
  });

  const data = JSON.stringify(message);
  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// 创建统一格式的消息
function createMessage(type, payload) {
  return {
    id: generateMessageId(),
    type,
    payload,
    timestamp: Date.now()
  };
}

// 生成唯一消息ID
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 根据文件名获取文件类型
function getFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const typeMap = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript'
  };
  return typeMap[ext] || 'application/octet-stream';
}

// 获取当前在线用户数
function getOnlineCount() {
  return clients.size;
}

// 获取所有在线用户
function getOnlineUsers() {
  const users = [];
  clients.forEach((client) => {
    users.push({
      userId: client.userId,
      username: client.username,
      avatar: client.avatar
    });
  });
  return users;
}

module.exports = {
  initWebSocket,
  MessageType,
  getOnlineCount,
  getOnlineUsers
};
