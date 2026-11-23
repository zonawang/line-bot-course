import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createBotServer, replyText, verifySignature } from '../src/bot.mjs';

const secret = 'fake-channel-secret';
const token = 'fake-channel-token';
const sign = (raw) => createHmac('sha256', secret).update(raw).digest('base64');

async function app(t, fetchImpl = async () => Response.json({})) {
  const errors = [];
  const server = createBotServer({ channelSecret: secret, channelAccessToken: token, fetchImpl, logger: { error: (...args) => errors.push(args) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    errors, base,
    post: (raw, signature = sign(raw)) => fetch(`${base}/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-line-signature': signature }, body: raw,
    }),
  };
}

test('學生可改寫的文字回覆、歡迎訊息與非文字提示', () => {
  assert.equal(replyText({ type: 'message', message: { type: 'text', text: '你好' } }), '你說：你好');
  assert.match(replyText({ type: 'follow' }), /第一個 LINE Bot/);
  assert.match(replyText({ type: 'message', message: { type: 'image' } }), /文字/);
  assert.equal(replyText({ type: 'unfollow' }), null);
  const long = replyText({ type: 'message', message: { type: 'text', text: '😀'.repeat(4000) } });
  assert.ok(long.length <= 4900);
  assert.equal(long.isWellFormed(), true);
});

test('簽章使用原始內容；改變空白、錯誤 secret、缺少簽章都不通過', () => {
  const raw = '{"events":[], "text":"你好😀\\n"}';
  assert.equal(verifySignature(raw, sign(raw), secret), true);
  assert.equal(verifySignature(JSON.stringify(JSON.parse(raw)), sign(raw), secret), false);
  assert.equal(verifySignature(raw, sign(raw), 'wrong'), false);
  assert.equal(verifySignature(raw, undefined, secret), false);
});

test('健康檢查與 LINE Verify 空事件可成功，無效請求不會呼叫 LINE', async (t) => {
  let calls = 0;
  const f = await app(t, async () => { calls++; return Response.json({}); });
  assert.equal((await fetch(`${f.base}/health`)).status, 200);
  assert.equal((await fetch(`${f.base}/`)).status, 200);
  assert.equal((await fetch(`${f.base}/webhook`)).status, 405);
  assert.equal((await fetch(`${f.base}/missing`)).status, 404);
  assert.equal((await f.post('{"events":[]}')).status, 200);
  assert.equal((await f.post('{"events":[]}', 'wrong')).status, 401);
  assert.equal((await f.post('not JSON')).status, 400);
  assert.equal((await f.post('{"events":null}')).status, 400);
  assert.equal((await f.post('null')).status, 400);
  assert.equal((await f.post('x'.repeat(1024 * 1024 + 1))).status, 413);
  assert.equal(calls, 0);
});

test('完整已簽章訊息會用正確權杖呼叫 LINE reply API', async (t) => {
  const calls = [];
  const f = await app(t, async (url, options) => { calls.push({ url, options }); return Response.json({}); });
  const raw = JSON.stringify({ events: [
    { type: 'message', replyToken: 'reply-1', message: { type: 'text', text: '我的 Bot 成功了' } },
    { type: 'unfollow' },
  ] });
  assert.equal((await f.post(raw)).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.line.me/v2/bot/message/reply');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    replyToken: 'reply-1', messages: [{ type: 'text', text: '你說：我的 Bot 成功了' }],
  });
});

test('等 LINE 回覆完成才結束請求，工作不依賴回應後的背景 CPU', async (t) => {
  let finish;
  let started;
  const began = new Promise((resolve) => { started = resolve; });
  const f = await app(t, async () => { started(); return new Promise((resolve) => { finish = () => resolve(Response.json({})); }); });
  let completed = false;
  const request = f.post(JSON.stringify({ events: [{ type: 'follow', replyToken: 'reply-1' }] })).then((result) => { completed = true; return result; });
  await began;
  assert.equal(completed, false);
  finish();
  assert.equal((await request).status, 200);
});

test('LINE 失敗或連線逾時時回報失敗，日誌不洩漏權杖與訊息', async (t) => {
  const f = await app(t, async () => new Response('private-upstream-body', { status: 401 }));
  const raw = JSON.stringify({ events: [{ type: 'message', replyToken: 'reply-1', message: { type: 'text', text: 'private-user-message' } }] });
  assert.equal((await f.post(raw)).status, 500);
  assert.deepEqual(f.errors, [['Webhook request failed', { status: 401 }]]);
  assert.doesNotMatch(JSON.stringify(f.errors), /private-|fake-channel-token/);
  const timeout = await app(t, async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  assert.equal((await timeout.post(raw)).status, 500);
});
