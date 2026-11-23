import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

// 完成部署後，可以先改這裡，做出自己的回覆。
export function replyText(event) {
  if (event.type === 'follow') return '你好！我是你的第一個 LINE Bot，傳一段文字給我試試看。';
  if (event.type !== 'message') return null;
  if (event.message?.type !== 'text') return '我現在會回覆文字，請傳一段文字給我。';
  if (typeof event.message.text !== 'string') return null;
  // 保留 LINE 文字長度餘裕，並避免切斷 emoji 的 UTF-16 字元。
  return `你說：${event.message.text}`.slice(0, 4900).replace(/[\uD800-\uDBFF]$/, '');
}

export function verifySignature(raw, signature, secret) {
  if (typeof signature !== 'string') return false;
  const expected = createHmac('sha256', secret).update(raw).digest('base64');
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        chunks.length = 0;
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
      } else chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
    request.on('aborted', () => reject(new Error('Request aborted')));
  });
}

export function createBotServer({ channelSecret, channelAccessToken, fetchImpl = fetch, logger = console }) {
  const server = createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(body));
    };
    const path = request.url?.split('?')[0];
    if (request.method === 'GET' && ['/', '/health'].includes(path)) {
      return send(200, { status: 'ok', message: 'LINE Bot is running' });
    }
    if (path !== '/webhook') return send(404, { error: 'Not found' });
    if (request.method !== 'POST') return send(405, { error: 'Use POST' });

    try {
      const raw = await readBody(request);
      // LINE 簽章必須使用原始內容驗證，再解析 JSON。
      if (!verifySignature(raw, request.headers['x-line-signature'], channelSecret)) {
        return send(401, { error: 'Invalid LINE signature' });
      }
      let body;
      try { body = JSON.parse(raw.toString('utf8')); }
      catch { return send(400, { error: 'Invalid JSON' }); }
      if (!body || !Array.isArray(body.events)) return send(400, { error: 'Invalid events' });

      // 等待回覆完成再結束請求，適用 Cloud Run 預設的請求期間 CPU 配置。
      await Promise.all(body.events.map(async (event) => {
        if (!event || typeof event.replyToken !== 'string' || !event.replyToken) return;
        const text = replyText(event);
        if (!text) return;
        const result = await fetchImpl('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: { Authorization: `Bearer ${channelAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyToken: event.replyToken, messages: [{ type: 'text', text }] }),
          signal: AbortSignal.timeout(5000),
        });
        await result.body?.cancel();
        if (!result.ok) {
          const error = new Error('LINE reply failed');
          error.status = result.status;
          throw error;
        }
      }));
      send(200, { ok: true });
    } catch (error) {
      // 日誌保留狀態碼，避免記錄金鑰或使用者的訊息內容。
      logger.error('Webhook request failed', { status: Number(error.status) || null });
      if (!response.writableEnded && !response.destroyed) {
        send(error.status === 413 ? 413 : 500, { error: error.status === 413 ? 'Body too large' : 'Unable to reply' });
      }
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  return server;
}
