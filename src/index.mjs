import { createBotServer } from './bot.mjs';

const required = ['LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`請先設定：${missing.join('、')}`);
  process.exit(1);
}
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT 必須是 1 到 65535 的整數。');
  process.exit(1);
}
const server = createBotServer({
  channelSecret: process.env.LINE_CHANNEL_SECRET.trim(),
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN.trim(),
});
server.on('error', (error) => {
  console.error('伺服器啟動失敗', { code: error.code });
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => console.log(`LINE Bot 已啟動，連接埠 ${port}；Webhook：/webhook`));
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 9000);
  deadline.unref();
  server.close(() => clearTimeout(deadline));
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
