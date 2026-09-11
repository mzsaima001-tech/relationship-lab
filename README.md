# 默契研究所 · Relationship Lab

> 你们之间，有没有一种问题，总是在重复发生？

面向中文用户的双人默契测试 + 29 原型人格测试产品站。
基于 Next.js 16 App Router + 本地 JSON Mock 数据库构建，便于零成本起步。

---

## 功能概览

- **双人默契测试**：邀请对方一起作答，AI 润色生成「关系画像」报告
- **人格测试**：36 题出 29 原型（15 主型 + 14 过渡型）的免费版 + 付费完整版
- **裂变分享**：分享 5 名朋友免费解锁完整报告（自动归因 + 自动解锁）
- **后台管理**（`/admin`）：题库 / 原型库 / 报告模板 CRUD

---

## 上手

```bash
npm install
cp .env.example .env        # 填 ADMIN_PASSWORD（≥12 位）
npm run dev                  # http://localhost:3000
```

---

## 发布前必读（重要）

部署生产环境前，请务必完成以下检查项：

1. **环境变量**：参考 `.env.example`，所有"必填"项必须设置
2. **管理员密码**：`ADMIN_PASSWORD` 至少 12 位含字母+数字；
   启动期若检测到默认值/弱密码，生产模式会拒绝启动
3. **支付通道**：星驿付聚合码目前仅是 `mock` + 静态收款码；
   正式营收需先接真网关回调（`/notify/xingyifu` 路线已留骨架）
4. **域名**：`NEXT_PUBLIC_SITE_URL` 必须设为真实业务域名（影响分享 URL / sitemap / 回调地址）
5. **数据库**：默认 `.local-db/*.json` 是开发态 Mock；
   生产建议替换 `lib/db/local.ts` 为真实数据库（Supabase / Postgres）

---

## 目录结构

```
app/
  ├─ api/          # 所有后端路由（含 /api/payment/* 支付 / /api/personality/* 人格）
  ├─ admin/        # 后台（题库、原型、报告模板管理）
  ├─ personality/  # 人格测试入口/答题/结果/报告
  ├─ share/        # 分享海报页
  ├─ pay/          # 支付页
  ├─ start/        # 默契测试入口
  ├─ result/       # 单人/双人结果页
  ├─ pair/         # 双人模式入口
lib/
  ├─ admin/        # 后台鉴权
  ├─ personality/  # 人格测试核心（评分、原型匹配、报告生成）
  ├─ assessment/   # 双人默契核心
  ├─ reports/      # 报告生成器
  ├─ db/local.ts   # JSON Mock DB（dev only）
  └─ payment/      # 支付网关骨架（即将接星驿付）
```

---

## 常用命令

```bash
npm run dev              # 开发模式
npm run build && start   # 生产模式
npx tsc --noEmit         # 仅类型检查
node scripts/test-29.ts  # 29 原型引擎冒烟测试
node scripts/test-archetype-diversity.ts  # 1000 虚拟用户原型分布
```

---

## 许可

© 默契研究所团队。未经允许不得复制 / 二次发布。
