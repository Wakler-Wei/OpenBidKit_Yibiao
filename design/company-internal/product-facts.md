# 事实与假设

2026-11-18 核实 fork 的 GitHub main 网页 currentOid 为 `13f239c7de8c5ffc7305315da22b25c8b3341fdd`；本地该对象存在，独立分支从其建立。不是从旧本地 main 或旧字数控制分支建立。远程网络曾失败，因此版本判断使用明确提交，不使用可能为空的 FETCH_HEAD。

源代码事实：

- `client/src/features/settings/pages/SettingsPage.tsx` 提供文本、生图、组件、智能体、通用和关于配置，包含官方 API 与第三方配置。
- `client/electron/services/configStore.cjs` 默认文本服务商为 `official`；仅视觉改名不能实现默认 BYOK。
- `client/src/styles/tokens.css` 当前主色蓝色，使用全局 CSS 和中文系统字体。
- `client/package.json` 的 productName/appId/图标/publish 与 `client/electron/main.cjs`、`client/index.html`、Sidebar 的展示品牌分别存在。
- 当前工作区以 SQLite 为权威；这轮初稿不写实际 user_config.json 或工作区。
- analytics 包含业务在线服务。BYOK 只改变模型凭证来源，不能据此声称所有数据均不出本机。

假设：只制作 Windows 优先初稿，保留 macOS 素材清单；不确定是否未来发布 macOS。示例域名使用保留的 `.example` 域，仅表达“自定义地址”字段，不提出公司域名方案。

用户确认（同日后续）：选择A；明确红色图形是“VP”，下方四个字是“微品致远”；授权先自行制作高清横版和方形母版、ICO/PNG给其确认，再实施客户端改造。本轮brand目录属于重建素材确认稿，不是已批准官方VI。
