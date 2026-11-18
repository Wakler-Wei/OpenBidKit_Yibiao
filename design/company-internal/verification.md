# 初稿验证

2026-11-18：使用 Node Playwright CLI，在 Chromium 实际加载本地静态页面。未启动真实 Electron，不读取实际 Key 或客户工作区。

- A/B/C 与六候选总览：1440×900、375×812 均已截图并目视检查；修复了 C 的窄屏网格最小宽度导致裁切的问题。
- 三稿图片加载成功；最终验证无页面 JS 异常、无 HTTP 失败资源。
- A/B 分类切换、Key 显隐；C 步骤切换和返回；三个版本的演示获取、保存反馈、高级参数展开已操作检查。
- 页面不请求模型服务，演示输入不写 localStorage、磁盘或 Main 配置。
- `node --check design/company-internal/design-demos/preview.js` 通过。
- Python 版 design_lint 的 check/compare 因缺少 Python Playwright 自动跳过；未将跳过当作通过。以 Node Playwright 和截图人工检查替代。三稿共享品牌色，主要区分导航结构及配置组织方式。
- client 产品代码未变更，未运行无关的整仓构建；这不是对正式客户端或发布安装包的验收。
- 截图在 `output/playwright/company-internal/`；桌面和窄屏各一张。可点击 HTML 与共享 CSS/JS 在 `design-demos/`，需一起保留。

本轮新增素材：用户原始 Logo 副本与裁白边预览副本；未生产正式 ICO/ICNS，也未用低分辨率图片伪造矢量源。

## 用户选A后的品牌素材迭代

用户补充“VP”“微品致远”准确文字，授权我们制作矢量和尺寸组。现新增 `brand/`，状态仍是**素材等待确认**。

- 独立SVG：4份，XML解析通过；无位图、外链字体或远程资源。
- RGBA PNG：12份；2400px横版两份、1024px母版两份、16至512px应用图标8份，四角透明且图案非空。
- ICO：Pillow重新读取并解码七帧，尺寸16/24/32/48/64/128/256齐全。
- Chromium实际查看确认页及独立SVG；1440px与375px检查，图片全部加载、无页面异常；已查看小尺寸图标及原图对照。
- 素材为纯路径重建稿，不是源位图放大、不是公司原始官方矢量文件；中文按用户确认文本重新排版转曲。
- 原A/B/C初稿保留作为历史；未将新素材应用至client，遵守“先发确认，再开始改造”的顺序。
