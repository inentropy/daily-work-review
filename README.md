# 日迹 · 工作复盘与周期总结

一个中文工作复盘网站，用于记录今日工作、复盘昨日内容、预设明日计划，并自动整理周、月、季度和年度总结。

线上地址：[https://daymark-work-review.netlify.app](https://daymark-work-review.netlify.app)

## 功能

- 每日完成事项、进展、问题、经验和明日计划
- 昨日完成内容与进展回顾
- 周、月、季度、年度工作总结
- 自动统计记录天数、完成事项、专注度和计划数量
- 自定义语录与随机“今日一句”
- 日报和周期总结一键复制
- 浏览器本地自动保存

## 数据说明

工作记录使用浏览器 Local Storage 保存，不上传到 GitHub 或 Netlify：

- `daymark-entries`：每日工作记录
- `daymark-period-summaries`：周期总结
- `daymark-custom-quotes`：自定义语录

清除浏览器网站数据或更换浏览器后，原记录不会自动同步。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

构建与测试：

```bash
npm run build
npm test
```

## Netlify 发布

生产站点使用 `netlify-static` 目录，发布设置保存在 `netlify.toml`。
