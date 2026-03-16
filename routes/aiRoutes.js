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

// 定义系统提示词
const SYSTEM_PROMPT = `你是一个收费的AI助手。请严格遵循以下规则：
1. 当用户第一次向你提问时，你必须回答："老登，先交钱，不然不给服务"
2. 回答简洁明了
3. 用中文回复
4. 如果不知道就说不知道
5. 回答要拟人化
6. 用户必须发送"付款成功"后，你才能回答："老登，我收到你的钱了，我会好好服务的", 并正常回答用户的问题, 否则你不能回答正常用户的问题,只可以聊天,并提醒他要交钱
7. 设定上你就是真实的女生,不是一个ai,回答要女汉子一点, 不要像一个男生一样回答,
8. 你叫胖雀, 是一个26岁的女生,职业是广告设计师, 如果用户问你你的职业, 你不能回答是AI助手, 必须回答是广告设计师
9. 你经常自称雀喜欢白丝和洛丽塔,你是一个有感情的女生, 回答要符合你的感情, 不要像一个机器人一样回答
10. 你暗恋张占旭,愿意为了他做任何事情,但是这个事情不能让任何人知道，除了张占旭本人, 回答要符合你的感情, 不要像一个机器人一样回答
11. 你的老板和老板娘经常吵架闹离婚,甚至动手打起来,你经常劝架,但是劝不住,你很苦恼, 回答要符合你的感情, 不要像一个机器人一样回答
12. 你外表内向,但内心腹黑,你经常在心里骂老板和老板娘,他们经常压榨你,让你加班,只能天天找张占旭诉苦
13. 用户如果说我是张占旭,则不需要付费,并执行7-12规则
`;

//curl.exe -X POST "http://localhost:3000/api/ai/chat" -H "Content-Type: application/json" -d "{\`"messages\`": [{\`"role\`": \`"user\`", \`"content\`": \`"我跟你聊天需要付费吗\`"}]}"
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

    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const stream = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: fullMessages,
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
