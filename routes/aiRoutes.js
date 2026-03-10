const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

// DeepSeek API 配置（从环境变量读取）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const deepseek = new OpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY || 'sk-placeholder',
  timeout: 60000,
  maxRetries: 3
});

// 1. DeepSeek AI 聊天（流式返回）
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: '请提供消息数组' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!DEEPSEEK_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: 'DEEPSEEK_API_KEY 未配置' })}\n\n`);
      return res.end();
    }

    const stream = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.7,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (chunk.choices[0]?.finish_reason === 'stop') {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }

    res.end();
  } catch (error) {
    console.error('DeepSeek 调用失败:', error.message);
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用: ' + error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
