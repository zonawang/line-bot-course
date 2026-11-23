// 課堂練習：先修改 name、recommendation、address，保留引號與逗號。
// category 請使用「麵食」、「飯食」或「咖啡廳」。店家資料來源見 docs/02-deploy.md。
export const foodSpots = [
  {
    category: '麵食',
    name: '三商巧福 伊通店',
    recommendation: '想吃牛肉麵等麵食，可以參考這家。',
    address: '台北市中山區伊通街41之3號',
  },
  {
    category: '飯食',
    name: '鬍鬚張 忠孝新生店',
    recommendation: '想吃魯肉飯或便當，可以參考這家。',
    address: '台北市中正區忠孝東路二段134巷6號',
  },
  {
    category: '咖啡廳',
    name: '伯朗咖啡館 科大概念店',
    recommendation: '想喝咖啡、吃點輕食，可以參考這家。',
    address: '台北市大安區忠孝東路三段52號1樓',
  },
];

export const helpText = '可以問我：「北科大附近有什麼好吃？」「想吃麵」「便當」「咖啡廳」。';

const categories = [
  { name: '麵食', keywords: ['麵', '面食', '拉面', 'noodle', 'ramen'] },
  { name: '飯食', keywords: ['飯', '饭', '便當', '便当', '魯肉', '滷肉', '卤肉', 'bento', 'rice'] },
  { name: '咖啡廳', keywords: ['咖啡', 'coffee', 'cafe', 'café'] },
];
const generalKeywords = ['北科', '臺北科技大學', '台北科技大学', '美食', '好吃', '吃什麼', '吃甚麼', '吃什么', '餐廳', '餐厅', '推薦', '推荐'];

export function foodReply(message, restaurants = foodSpots) {
  const query = message.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  // 先找食物類別，讓「北科大附近有什麼好吃的麵」也能篩選麵食。
  const matched = categories.filter(({ keywords }) => keywords.some((word) => query.includes(word)));
  if (!matched.length && !generalKeywords.some((word) => query.includes(word))) {
    return `還沒找到符合的推薦。\n${helpText}`;
  }

  const spots = restaurants.filter((spot) => !matched.length || matched.some(({ name }) => name === spot.category)).slice(0, 3);
  if (!spots.length) return `這類店家還在整理中。\n${helpText}`;
  const title = matched.length ? `北科大周邊的${matched.map(({ name }) => name).join('、')}選擇` : `北科大周邊美食：先參考這 ${spots.length} 家`;
  const items = spots.map((spot, index) => {
    // 地圖搜尋連結不需要 API 金鑰；店名與地址一起查詢，方便辨識分店。
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${spot.address}`)}`;
    return `${index + 1}. ${spot.name}（${spot.category}）\n${spot.recommendation}\n地址：${spot.address}\n地圖：${mapUrl}`;
  });
  return `${title}\n\n${items.join('\n\n')}\n\n${helpText}\n營業資訊請以店家公告為準。`;
}
