
# TennisScore — Vercel 部署安全版

React + Vite + Tailwind +（shadcn 风格组件）。数据源：API-Tennis。生产环境通过 `/api/tennis` Serverless Function 代理，API Key 存在 Vercel 的 `TENNIS_API_KEY`。

## 本地开发
```bash
npm install
cp .env.example .env
# 任选其一：
# 1) .env 写 VITE_TENNIS_API_KEY（直连）
# 2) .env 写 VITE_TENNIS_API_PROXY=https://your-app.vercel.app/api/tennis
npm run dev
```

## Vercel 部署
1. 推到 GitHub
2. Vercel 导入仓库 → Settings → Environment Variables
   - `TENNIS_API_KEY` = 你的 API-Tennis Key
3. Deploy 后访问 `https://你的项目.vercel.app`

## 注意
- 详情页技术统计为基于 point-by-point 的简易估算；若需要精确 Aces/DF/UE/Winner，请接入更细事件源。
- 已在 `vite.config.ts` 配置 `@` 别名。
