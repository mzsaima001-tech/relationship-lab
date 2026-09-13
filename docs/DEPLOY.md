# 默契研究所 · 部署指南（Supabase + Vercel）

> **TL;DR**：把代码推到 GitHub → Vercel 导入仓库 → Supabase 建表 + 取两个 key → Vercel 配 env → 部署。
> 全程零成本，**永久免费**（Supabase Free Tier + Vercel Hobby）。

---

## 0. 为什么是 Supabase + Vercel

| 需求 | 满足方式 |
|---|---|
| **持久化** | Vercel Hobby 没有持久磁盘（`.local-db/*.json` 每次部署会被清空），必须用外部 DB |
| **零成本** | Supabase Free Tier 永久免费：500 MB Postgres、50k MAU、2 GB 出口流量 |
| **零运维** | 无需自建服务器，Vercel 托管 Next.js，Supabase 托管 PG |
| **平滑升级** | 项目成长后只需在 Supabase / Vercel 控制台一键升级 Pro，无需数据迁移 |

---

## 1. 你需要准备的 4 件事

在开始之前，把这些账号 / 凭证备好（缺一个就跑不下去）：

| 序号 | 准备什么 | 在哪里拿 |
|---|---|---|
| ① | **GitHub 仓库**（项目已推上去） | https://github.com/new — 把 `relationship-lab/` 推上去 |
| ② | **Supabase 项目 URL** | https://supabase.com/dashboard → New project → 拿到 `https://xxxxx.supabase.co` |
| ③ | **Supabase service_role key** | Supabase → Project Settings → API → `service_role` secret（⚠️ 这是绕过 RLS 的全权 key，只放服务端，绝不暴露前端） |
| ④ | **Vercel 账号**（GitHub 登录即可） | https://vercel.com/signup |

> 域名可暂用 Vercel 默认子域名 `xxx.vercel.app`，0 元。
> 等有需要再绑自定义域名（Vercel 控制台 → Domains → 添加，DNS 改解析即可）。

---

## 2. 一次性操作：Supabase 建表

1. 打开 https://supabase.com/dashboard → 选你的项目
2. 左侧菜单 **SQL Editor** → **New query**
3. 把 `lib/db/schema.sql` 的全部内容粘进去
4. 点右下角 **Run**（约 5 秒完成）
5. 应该看到底部输出 12 张表名 + 1 个 RPC function：
   ```
   answers  credit_accounts  invites  pairs  payment-related  personality_*
   reports  results  sessions  shares
   ```
6. 任何时候想重置 → 同 SQL 重新跑（已带 `IF NOT EXISTS` / `CREATE OR REPLACE`，幂等）

---

## 3. 把代码推到 GitHub

```bash
cd relationship-lab
git init
git add .
git commit -m "feat: prepare for cloud deploy"
# 在 GitHub 新建空仓库（不要勾 README / .gitignore / License）
git remote add origin https://github.com/<your-name>/relationship-lab.git
git branch -M main
git push -u origin main
```

如果已经初始化过 git：

```bash
git remote set-url origin https://github.com/<your-name>/relationship-lab.git
git push -u origin main
```

---

## 4. Vercel 导入仓库

1. 打开 https://vercel.com/new
2. **Import Git Repository** → 选 `relationship-lab`
3. **Project Name**：随便起（如 `relationship-lab`）
4. **Framework Preset**：自动识别 `Next.js`，保留默认
5. **Root Directory**：保持 `./`（整个仓库就是 Next.js 项目）
6. **Build & Output Settings**：全部默认即可（`vercel.json` 已声明）
7. **Environment Variables**：先点开折叠区，把下面这些填进去（**先空着也行，等下一步再补**）

---

## 5. Vercel 配环境变量（最关键一步）

进入 Vercel 项目 → **Settings** → **Environment Variables**，按下表添加（每条都勾选 Production / Preview / Development 三栏）：

| 变量名 | 值 | 必填？ | 说明 |
|---|---|---|---|
| `ADMIN_PASSWORD` | 一个 ≥12 位的字母+数字密码 | ✅ 必填 | 后台 `/admin/login` 的密码，dev 默认值仅本地警告 |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app`（首次部署后补） | ✅ 必填 | 分享文案、sitemap、OAuth 回跳都会用 |
| `SUPABASE_URL` | Supabase Project URL（步骤 2） | ✅ 必填 | DB 切到云端的开关 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（步骤 2） | ✅ 必填 | ⚠️ 千万别加 `NEXT_PUBLIC_` 前缀，否则泄露 |
| `AI_API_KEY` | `sk-xxx` | ⚪ 选填 | 不填 → 报告只用本地模板（仍可看，AI 润色 0 元 0 延迟） |
| `AI_BASE_URL` | `https://api.lk888.ai/v1` | ⚪ 选填 | AI 网关 base URL |
| `AI_MODEL` | `gem-3.5-flash-lite` | ⚪ 选填 | 模型名 |
| `AI_POLISH_ENABLED` | `true` | ⚪ 选填 | 是否启用 AI 润色 |
| `XINGYIFU_MCH_ID` | 商户号 | ⚪ 等接支付 | 不填 → 走 mock 静态码 |
| `XINGYIFU_MCH_KEY` | 商户密钥 | ⚪ 等接支付 | HMAC-SHA256 签名 |
| `XINGYIFU_NOTIFY_URL` | `https://your-app.vercel.app/notify/xingyifu` | ⚪ 等接支付 | 异步回调 |
| `DB_MODE` | `auto` | ⚪ 默认即可 | `auto` = 有 SUPABASE_URL 自动云端；`force_local` 强制本地 |

### 填完后

- 点 **Save**（每条都会自动触发重部署，无需手点 Deploy）
- 重新进入 **Deployments** → 最新一次部署 → 等它跑完（一般 1-2 分钟）

---

## 6. 第一次部署后的检查清单

部署成功后（Status = Ready），按顺序测试：

1. **首页** `https://your-app.vercel.app/`
   - 看到主视觉、CTA 按钮
   - 浏览器 DevTools → Console 无红字

2. **静态页**
   - `/personality` 人格测试入口
   - `/start` 双人默契入口
   - `/admin/login` 后台登录（用 `ADMIN_PASSWORD` 试）

3. **数据库连通性测试**
   - 访问 `/admin/overview`（登录后）
   - 看到「Sessions」「Reports」「Payments」列表
   - **首次应该都是空的**，说明 Supabase 连上了

4. **端到端流程**
   - `/personality` → 完成 30 题 → 看免费版报告（AI 润色默认开，3-8 秒）
   - `/personality/result/PST_xxxxx` → 应该有完整 29 原型数据
   - `/start` → 完成 22 题 → 看单人报告

5. **支付闭环（mock 模式）**
   - 点「解锁完整报告」→ 应该看到二维码 + 主动确认按钮
   - 点确认 → 报告解锁
   - 在 Supabase → `payments` 表里能看到一条 `status=paid` 记录
   - 在 `personality_tests` 表里能看到对应 `is_paid=true`

6. **域名 / sitemap**
   - `https://your-app.vercel.app/sitemap.xml` 应有 6 个入口
   - `https://your-app.vercel.app/robots.txt` 应 `Disallow: /admin /api /pay`

---

## 7. 接星驿付真网关（上线后随走随填）

代码骨架已完成，只需补 3 个 env + 给星驿付技术支持开通回调：

1. 拿到 `XINGYIFU_MCH_ID` / `XINGYIFU_MCH_KEY`
2. 配置 `XINGYIFU_NOTIFY_URL=https://your-app.vercel.app/notify/xingyifu`（在星驿付商户后台）
3. Vercel 项目填这 3 个 env → 等下一次部署生效
4. 测试：扫码 → 星驿付商户后台应看到订单 → 支付 → `/notify/xingyifu` 收到 POST → `payments` 表 status=paid

回跳 / 同步通知 / 签名校验 / 幂等处理都已写在 `lib/payment/xingyifu.ts` + `app/notify/xingyifu/route.ts` 里。

---

## 8. 数据导出 / 备份

Supabase Free Tier 自动每日快照保留 7 天。手动导出：

```bash
# 项目根目录
SUPABASE_DB_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres \
  pg_dump --no-owner --no-privileges > backup-$(date +%F).sql
```

或在 Supabase 控制台 → **Database** → **Backups** → 一键下载。

---

## 9. 监控（上线后第 1 周再开）

| 项 | 工具 | 成本 |
|---|---|---|
| 错误日志 | Vercel Runtime Logs（自带） | 免费 |
| 慢 API | Vercel Analytics | 免费 50k events/月 |
| Uptime | UptimeRobot 免费层 | 50 monitor / 5 min 间隔 |
| 真上线再考虑 | Sentry / Logflare | 看流量 |

---

## 10. 升级付费路径

业务起来后：

| 触发条件 | 升级 | 月成本 |
|---|---|---|
| 单用户数据库 ≥ 400 MB / MAU ≥ 40k | Supabase Pro | $25/月 |
| 月调用 ≥ 5M 或带宽 ≥ 80 GB | Vercel Pro | $20/月 |
| 想免运维 + 全球 CDN 更快 | Cloudflare 兜底 | $5/月起 |

**无需数据迁移** — 都在原 Supabase 项目上原地升级套餐。

---

## 11. 故障排查

| 现象 | 原因 | 修法 |
|---|---|---|
| 首页 500 / DB 调用报错 | `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 没填或填错 | Vercel → Settings → Env 重填，Redeploy |
| 报告 / 测评数据丢失 | `DB_MODE=force_local` 被误开 | 把 `DB_MODE` 改回 `auto` 或删掉 |
| admin 登录 401 | `ADMIN_PASSWORD` 未设或太短 | 设一个 ≥12 位密码 |
| sitemap 是空 | `NEXT_PUBLIC_SITE_URL` 还是 `example.com` | 改成实际域名 |
| 星驿付回调 403 | 没填 `XINGYIFU_MCH_ID` | 补 env，或暂时保持 mock 模式 |
| 报告 502 / 超时 | AI 网关慢 / 限流 | 把 `AI_POLISH_ENABLED` 设 `false` 走模板 |

---

## 一句话总览

```
GitHub push → Vercel import → Supabase 建表 + 拿 2 个 key
   → Vercel 配 env → Deploy → 检查清单
```

需要任何步骤协助，告诉我「现在卡在第 X 步」即可。