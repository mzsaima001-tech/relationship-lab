"""截图验证：性格测试结果页已是「米色信纸 + 金色打亮」"""
import subprocess, os, time, socket

os.chdir(r'C:\Users\15944\workbuddy-ai\测试\relationship-lab')
node = r'C:\Users\15944\.workbuddy\binaries\node\versions\22.22.2-3\node.exe'

# 找空闲端口
def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p
port = free_port()
print(f'使用端口 {port} ...')

# 起 prod server（绕过 dev hot reload 缓存）
print('启动 prod server ...')
proc = subprocess.Popen(
    [node, './node_modules/next/dist/bin/next', 'start', '-p', str(port)],
    cwd=os.getcwd(),
    stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    env={**os.environ, 'FORCE_COLOR': '0'},
)
print(f'PID {proc.pid}, 等待 5s 冷启动 ...')
time.sleep(5)

# 写内嵌 puppeteer 脚本
inner_js = r'''
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[PAGE ERR]', e.message));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:PORT/personality/result/PST_ea7a45d4?nocache=' + Date.now(),
    { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'C:/Users/15944/workbuddy-ai/测试/relationship-lab/_NOW-paper-full.png', fullPage: true });
  console.log('full page screenshot done');
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
'''.replace('PORT', str(port))

with open('_puppeteer.js', 'w', encoding='utf-8') as f:
    f.write(inner_js)

print('运行 puppeteer 截图 ...')
env = {**os.environ}
env['NODE_PATH'] = r'C:\Users\15944\.workbuddy\binaries\node\workspace\node_modules'
r = subprocess.run([node, '_puppeteer.js'], cwd=os.getcwd(), env=env,
                   capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=60)
print('STDOUT:', r.stdout.strip()[:500])
if r.stderr.strip():
    print('STDERR:', r.stderr.strip()[:500])

# 关 prod server
proc.terminate()
time.sleep(1)
try: proc.kill()
except: pass

# 清理脚本
if os.path.exists('_puppeteer.js'):
    os.remove('_puppeteer.js')

if os.path.exists('_NOW-paper-full.png'):
    print('✅ 截图生成：_NOW-paper-full.png')
else:
    print('❌ 截图未生成')
