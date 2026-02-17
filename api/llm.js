/**
 * 大模型代理 API（可选功能）
 * POST /api/llm
 * Body: { provider, model, messages: [{role, content}] }
 */

const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    buildBody: (model, messages) => ({ model, messages }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  gemini: {
    url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    keyEnv: 'GOOGLE_GEMINI_API_KEY',
    buildBody: (_model, messages) => ({
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    }),
    extractText: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    authStyle: 'query',
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    buildBody: (model, messages) => ({ model, messages }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
  dashscope: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyEnv: 'DASHSCOPE_API_KEY',
    buildBody: (model, messages) => ({ model, messages }),
    extractText: (data) => data.choices?.[0]?.message?.content || '',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, model, messages } = req.body || {};

  if (!provider || !model || !messages?.length) {
    return res.status(400).json({ error: 'Missing provider, model, or messages' });
  }

  const config = PROVIDERS[provider];
  if (!config) {
    return res.status(400).json({ error: `Unknown provider: ${provider}. Supported: ${Object.keys(PROVIDERS).join(', ')}` });
  }

  const apiKey = process.env[config.keyEnv];
  if (!apiKey) {
    return res.status(503).json({ error: `${config.keyEnv} not configured` });
  }

  try {
    const url = typeof config.url === 'function' ? config.url(model) : config.url;
    const finalUrl = config.authStyle === 'query' ? `${url}?key=${apiKey}` : url;

    const headers = { 'Content-Type': 'application/json' };
    if (config.authStyle !== 'query') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(config.buildBody(model, messages)),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `LLM API error: ${errText}` });
    }

    const data = await response.json();
    const text = config.extractText(data);

    return res.status(200).json({ text, raw: data });
  } catch (e) {
    console.error('LLM proxy error:', e);
    return res.status(500).json({ error: e.message });
  }
}
