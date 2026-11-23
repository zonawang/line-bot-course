import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { createBotServer, replyText, verifySignature } from '../src/bot.mjs';
import { foodReply } from '../src/food.mjs';

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

const messageReply = (text) => replyText({ type: 'message', message: { type: 'text', text } });
// 測試使用獨立店家資料，讓同學可以自由更換課程的推薦名單。
const spots = [
  { category: '麵食', name: '測試麵店', recommendation: '牛肉麵', address: '測試路1號' },
  { category: '飯食', name: '測試飯店', recommendation: '便當', address: '測試路2號' },
  { category: '咖啡廳', name: '測試咖啡店', recommendation: '咖啡', address: '測試路3號' },
];
const foodAnswer = (text) => foodReply(text, spots);

test('一般美食問題會列出三家店、推薦內容與可辨識分店的地圖連結', () => {
  const text = foodAnswer('北科大附近有什麼好吃？');
  assert.match(text, /1\. 測試麵店/);
  assert.match(text, /2\. 測試飯店/);
  assert.match(text, /3\. 測試咖啡店/);
  assert.match(text, /牛肉麵/);
  const maps = [...text.matchAll(/https:\/\/www\.google\.com\/maps\/search\/\?[^\s]+/g)];
  assert.equal(maps.length, 3);
  assert.equal(new URL(maps[0][0]).searchParams.get('query'), '測試麵店 測試路1號');
  assert.ok(text.length <= 4900);
  assert.equal(text.isWellFormed(), true);
});

test('類別優先於一般美食關鍵字，也支援便當、咖啡與常見輸入形式', () => {
  for (const query of ['想吃麵', '北科大附近有什麼好吃的麵？', '拉面', 'ＲＡＭＥＮ']) {
    const text = foodAnswer(query);
    assert.match(text, /1\. 測試麵店/);
    assert.doesNotMatch(text, /測試飯店|測試咖啡店/);
  }
  for (const query of ['有便當推薦嗎？', '想吃飯', '便当']) {
    const text = foodAnswer(query);
    assert.match(text, /1\. 測試飯店/);
    assert.doesNotMatch(text, /測試麵店|測試咖啡店/);
  }
  for (const query of ['有咖啡廳嗎？', '  C a f é  ', 'COFFEE']) {
    const text = foodAnswer(query);
    assert.match(text, /1\. 測試咖啡店/);
    assert.doesNotMatch(text, /測試麵店|測試飯店/);
  }
  const both = foodAnswer('麵食或便當都可以');
  assert.match(both, /測試麵店/);
  assert.match(both, /測試飯店/);
  assert.doesNotMatch(both, /測試咖啡店/);
});

test('歡迎、非文字與不支援的問題會提示問法；其他事件不回覆', () => {
  assert.match(replyText({ type: 'follow' }), /北科大美食小幫手/);
  assert.match(replyText({ type: 'message', message: { type: 'image' } }), /請用文字/);
  assert.equal(replyText({ type: 'unfollow' }), null);
  assert.equal(replyText({ type: 'message', message: { type: 'text' } }), null);
  for (const query of ['明天天氣如何？', '', '😀'.repeat(4000)]) {
    const text = messageReply(query);
    assert.match(text, /還沒找到符合的推薦/);
    assert.match(text, /北科大附近有什麼好吃/);
    assert.doesNotMatch(text, /maps\/search/);
  }
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
    { type: 'message', replyToken: 'reply-1', message: { type: 'text', text: '北科大附近有什麼好吃？' } },
    { type: 'unfollow' },
  ] });
  assert.equal((await f.post(raw)).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.line.me/v2/bot/message/reply');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    replyToken: 'reply-1', messages: [{ type: 'text', text: messageReply('北科大附近有什麼好吃？') }],
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
