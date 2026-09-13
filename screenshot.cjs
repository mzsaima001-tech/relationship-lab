// 用 puppeteer-core + 现成 Chrome 截图
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Users/15944/.cache/puppeteer/chrome/win64-152.0.7977.75/chrome-win64/chrome.exe';
const TARGETS = [
  { url: 'http://localhost:3738/share/personality/2997504c92a9', filename: 'share-personality-v3-card.png' },
  { url: 'http://localhost:3738/share/8e97cb44-83d3-4c20-a1d6-03621d3cdd04', filename: 'share-couple-v3-card.png' },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 414, height: 1100, deviceScaleFactor: 2 },
  });
  for (const t of TARGETS) {
    const page = await browser.newPage();
    console.log('>>', t.url);
    await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 });
    // 等 mock 用例的数据 fetch 完成 + 渲染出 share-poster
    await new Promise((r) => setTimeout(r, 2500));
    // 截取整个海报卡片 + 按钮区
    const sel = '#share-poster';
    const el = await page.$(sel);
    const cardOut = path.resolve('C:/Users/15944/workbuddy-ai/测试/' + t.filename);
    if (el) {
      await el.screenshot({ path: cardOut, omitBackground: false });
      console.log('  full card ->', cardOut);
    }
    // 截全屏作参考
    const full = path.resolve('C:/Users/15944/workbuddy-ai/测试/' + t.filename.replace('.png', '-full.png'));
    await page.screenshot({ path: full, fullPage: true });
    console.log('  full page ->', full);
    await page.close();
  }
  await browser.close();
  console.log('DONE');
}
main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
