# 内部版第一批代码改造验收记录

分支：`codex/company-internal`，基线 `13f239c7`。产品名：微品致远投标工作台。当前为开发版本 0.1.0。

## 自动检查

在 `client/` 运行：

```powershell
npm run build
node --check electron/main.cjs
node --check electron/ipc/index.cjs
node --check electron/services/configStore.cjs
node --check electron/services/updateService.cjs
node scripts/check-company-internal.cjs
npm run smoke:electron-native
```

上述检查通过。Vite 仍有已有的 chunk 体积警告。没有新增依赖或修改锁文件。

专项检查使用系统临时目录与虚拟 Key，不读取客户配置。验证文本与图片自定义档案、服务商切换、官方凭证隔离、埋点身份保留、全部更新入口禁用，以及包元数据与产品常量一致。

首次 `npm ci` 因下载重置后回退本地编译、且缺少 Visual Studio 失败；随后 `npm ci --ignore-scripts` 安装锁定依赖，执行仓库原有 patch、Electron 安装脚本，并成功下载对应 Electron ABI 145 的 better-sqlite3 12.10.0 预编译包。原生冒烟确认 SQLite 能打开内存数据库并执行查询。没有安装系统编译器或改变依赖版本。

## 真实 Electron 验证

- 启动 Vite `127.0.0.1:5173 --strictPort`，用原 preload 与 Main 启动 Electron 41.10.2；通过本机 CDP 附加 Playwright 检查真实窗口，没有模拟 IPC。
- 窗口与网页标题为“微品致远投标工作台”，公司 Logo、折叠方形图标均显示。
- 全新配置自动进入文本模型设置；文本、生图均默认“自定义”，下拉列表没有作者官方 API。
- 用 `https://example.invalid/v1`、虚拟 Key 和模型名填写并通过界面保存。关闭客户端并重新启动后，Main 配置中三项均保留；最后经界面清空并保存，已核实虚拟字段无残留。
- IPC 检查更新返回 `enabled: false` 与人工分发提示；通用与关于页没有可选的作者更新渠道。
- 独立配置实际写入 `%APPDATA%\weipin-bid-workbench\user_config.json`，没有迁移原软件数据。
- 检查文本、生图、通用、关于、侧栏折叠；桌面与 1280×800 无 body 或设置区域横向溢出，页签高度 48px，长表单在内部滚动。
- 首轮截图发现页签被压缩与侧栏文字换行，修正后再次截图核实。

截图位于 `output/playwright/company-internal/`：

| 文件 | 内容 |
|---|---|
| client-text-desktop.png | 桌面文本模型设置 |
| client-text-1280.png | 1280×800 文本模型设置 |
| client-text-collapsed.png | 折叠侧栏及方形图标 |
| client-image-1280.png | 生图模型配置 |
| client-general-desktop.png | 通用与人工更新说明 |
| client-about-desktop.png | 产品信息、授权状态及开源归属 |

## 限制与待办

未执行真实模型调用、完整标书生成、Word 导出、安装包安装或 macOS 测试，不把配置与 UI 检查等同于生成链路验收。

第一批品牌验收时作者公告与广告仍会显示；后续广告清理已关闭这些展示与请求，见下方补充。原文档、更新日志、插件与组件、模型信息、授权、IP 限制、诊断和 Analytics 保持原实现；后续处理这些服务时要按全量审查逐项确认，Analytics 必须等价保留。查看原项目公告/日志时发现现有 Radix 描述与 Markdown key 开发警告，未在品牌改造中扩展修复。

第一批验收时开发模式授权返回 `debug_disabled`；后续已采用明确的内部发行模式并完成打包目录验证，以下补充取代这项待办。

本轮未提交、推送或发版。下一步边界见 `company-internal-plan-2026-11-18.md`。

## 后续单步：广告清理

用户要求先处理启动推广公告与侧栏广告，再逐步决定后续任务。

- `App` 禁用自动公告；`useAutomaticNotice` 在禁用时不请求内容、不准备媒体、不注册检查入口、不启动轮询。
- 侧栏不挂载 `SidebarAdCard`，也不挂载公告列表和未读检查；文档/设置两项底部布局已适配。
- 保留广告/公告组件与统计函数源码；未修改 `shared/analytics`、Worker 或 Dashboard。没有展示的推广不产生虚假送达/点击事件。
- `npm run build` 通过，仅有既有大 chunk 提示。
- 真实 Electron 重载后检查：广告卡 0、公告弹窗 0、自动公告检查入口 undefined；广告/公告内容和未读接口请求 0；捕获到普通 `/track` 请求 9 次，确认采集仍运行（开发模式请求数不作为生产统计口径）。
- 截图：`output/playwright/company-internal/client-no-ads-desktop.png`。未改模型/业务流程，未打包或发布。

## 后续单步：内部发行与授权

### 原行为与实现

原 `licenseService` 仅在 `!app.isPackaged` 时跳过激活，打包后会向作者 `/license/activate` 申请许可证，用原公钥验证构建证明。原 Release CI 还要求作者签名私钥。

内部版在 `assets/product.json` 明确设置 `distribution: internal-manual`，经独立 `internalDistributionService` 提供兼容的 IPC 状态。开发与打包均返回 `internal_distribution`，无激活、订阅或到期机制；不读取现有 `license.json`，不申请作者授权，不将旧许可证用于诊断。`sourceTrusted`、`buildTrusted` 均为 false，不伪造作者签名认证或 OS 签名。

关于页展示“公司内部发行 · 无需激活”，不提供作者离线激活入口；异常提示不再链接作者下载页。原许可实现保留在非内部发行分支，LICENSE/NOTICE 保持原文。

构建脚本为内部版生成明确标记为 `algorithm: none` 的未签名构建信息，无需作者私钥；本地 dist 脚本与 Release CI 共用生成器。正式非内部发行在 CI 仍要求私钥，签名要求并未全局放宽。仓库构建信息是空提交/时间的模板，打包时写入实际构建信息。

### 检查结果

- `node scripts/check-internal-distribution.cjs` 通过：开发/打包状态一致，刷新/激活路径不调用网络或文件对话框；不访问已有数据、不读取配置；构建不需要作者密钥，非内部 CI 缺私钥仍失败。
- Main 服务/构建脚本语法检查、原 `check-company-internal.cjs`、TypeScript/Vite 构建与 Release YAML 解析通过。
- 使用 electron-builder `--win --dir --publish never` 制作 `client/release/internal-distribution-check-20261118/win-unpacked/`，并实际运行其中的“微品致远投标工作台.exe”。页面来自 `resources/app.asar/dist/index.html`，未使用 Vite，也未模拟 IPC。
- 打包程序实际 IPC 返回 `internal_distribution`，刷新后不变；授权弹窗 0、离线激活按钮 0、广告卡 0；关于页文本符合预期。
- 打包程序重载时捕获到 `app_open`、`config_usage`、`page_view` 等普通 `/track` 请求，携带 `license_status=internal_distribution` 和 `source_trusted=false`，统计采集未移除；Worker、聚合与 Dashboard 未修改。
- 截图：`output/playwright/company-internal/client-internal-distribution-packaged.png`。

### 限制及关联影响

这是启动与发行状态检查包，未准备 `vendor/openxml-tools/win32-x64` 和 `vendor/diagnosis-source`，electron-builder 已报告两项缺失；不能作为完整安装包分发，没有验证 Word 导出、付费模型、正式安装/卸载与 macOS。

原 Agent 失败诊断上传需要作者许可证；内部发行服务返回 null，现有 reporter 因凭证缺失不触发上传。没有伪造作者许可证，也没有改动 reporter 或普通统计实现。诊断的本地留存与公司接收方案仍待后续单独处理；不要把普通 `/track` 与该链路混为一谈。

当时打赏/赞助和支持入口尚未修改，后续处理结果见下文；未提交、推送或发布 Release。

## 后续单步：打赏、赞助与作者支持入口清理

- 侧栏删除“· 自配 Key”，保留“公司内部版”；文本/生图第三方 Key 配置不变。
- 不再挂载全局 DonationPromptProvider；内部发行的 Main donationService 不产生时长/导出阈值提示，不恢复或轮询历史订单，四个支付 IPC 方法均在本地返回停用错误，不向作者支付 API 发请求。兼容 IPC 与非内部发行服务实现保留。
- 保留 donation_state.json 中累计运行时长、Word 导出次数、历史订单和支付标记；不伪造打赏成功状态。导出仍在原 IPC 累计次数，成功/失败流程与进度不变。
- 删除 `.github/FUNDING.yml` 爱发电赞助配置；删除侧栏/关于页原作者文档站入口。原项目更新日志作为技术资料保留，源码、LICENSE/NOTICE 与关于页原作者归属保持。
- “联系作者购买离线包”改为联系内部管理员；图片知识库、AI评标等未开放功能的求 Star 提示改为普通功能说明，不再有作者仓库跳转按钮。
- `node scripts/check-internal-support.cjs` 通过：中文临时目录、跨 5 小时/5 次导出档位、重启累计、旧订单不恢复、支付方法无网络、真实导出 IPC 的成功/失败转发与次数累计。
- Main/专项脚本语法检查、已有公司配置/内部发行检查及 TypeScript/Vite 构建通过；仅既有大 chunk 提示。
- 真实 Electron 验证：侧栏只显示公司内部版，底部仅设置；关于页原文档站入口为 0，归属说明保留。真实 `donation:get-config` 返回内部版停用错误；图片知识库只弹出“此功能暂未开放，请关注后续内部版本。”，无直达按钮。重载后无页面脚本异常，普通 `/track` 请求继续发送。
- 截图：`output/playwright/company-internal/client-support-cleanup-about.png`、`client-support-cleanup-notice.png`。

本轮没有执行真实支付、付费模型调用或完整 Word 导出；导出检查使用假 exportService 验证真实 IPC 编排。没有修改 Analytics、Worker、Dashboard 或诊断上传方案，没有重新打包、提交或推送。

## 故障修复：模板预览与应用验证

用户反馈预览或应用模板失败，本轮暂停其他公司化改造。

### 复现与原因

真实 Electron 打开“模版设置”后，`templates:render-preview` 返回 `dotnet build ... No .NET SDKs were found`，页面无法显示 Word 样张。当前机器只有 .NET 运行库，没有编译 `net10.0` 助手需要的 SDK；此前用于内部发行启动检查的 `internal-distribution-check-20261118` 包也确实未携带 `openxml-tools/win32-x64`，只能验证启动，不能验证模板或 Word 功能。

`git diff --exit-code` 核对模板页面、templateStore、templateIpc 和 openXmlHelperService 均与基线相同。已定位到的直接故障是开发/检查包依赖缺失，没有通过改写模板业务逻辑或清空用户数据处理。

### 处理

- 从 Microsoft .NET 10 官方元数据获取 SDK 10.0.404 ZIP，SHA512 校验后解压到 `%LOCALAPPDATA%\WeiPinDev\dotnet`；未进行系统级安装。开发启动时临时设置 PATH 与 DOTNET_ROOT 指向该目录。
- 使用仓库既有 `prepare-openxml-helper.cjs` 发布 Windows x64 自包含助手，输出到已忽略的 `client/vendor/openxml-tools/win32-x64`。运行打包客户端无需安装 .NET。
- `package.json` 的 `build.beforePack` 接入 `check-openxml-before-pack.cjs`：对应平台助手缺失就明确中止打包，避免 electron-builder 仅警告却留下缺功能的 EXE。未改变模板 CRUD、预览、项目选用或导出业务代码。
- 生成诊断源码归档并重建检查目录 `client/release/template-repair-20261118/win-unpacked/`，其中包含 `resources/openxml-tools/win32-x64/openxmlhelper.exe` 和 `resources/diagnosis-source/source.zip`。诊断归档仍按原脚本来自 HEAD，不含尚未提交的公司化改造。

### 验证

- `node scripts/check-openxml-packaging.cjs`：Windows x64 / macOS x64、arm64 助手缺失时中止、存在时继续的检查通过；这不等于 macOS 运行验收。
- `node_modules/.bin/electron.cmd scripts/check-template-preview.cjs`：真实 Electron、独立中文临时工作区、真实 SQLite、自包含助手，三套系统模板均生成可读取的 DOCX；复制、修改、保存、项目选用与重启后模板 ID/配置恢复通过。横向纸张确实写入 `word/document.xml`；正式导出准备阶段读取同一模板配置。装饰页眉页脚也使用真实隐藏窗口转图。
- 真实开发窗口完成新建、命名、保存、修改横向纸张并读回。仅清理此次创建的 `tpl-a693918b-77a4-4282-a38f-b6cdb44e30b1` 测试模板，没有删除已有用户模板。
- 实际运行新目录中的“微品致远投标工作台.exe”，页面来自 `app.asar/dist/index.html`；依次选择标准投标简版、A4 图文版、A3 横版图文，均有 Word 正文且无预览错误。实际助手进程来自包内 `resources/openxml-tools`，未依赖开发 SDK。
- 构建、脚本语法、公司配置/支持入口检查、Electron native 冒烟均通过；既有 Vite 大 chunk 与 C# nullable 警告未扩展修复。
- 证据截图：`output/playwright/company-internal/template-preview-before.png`、`template-preview-packaged-fixed.png`。

### 打包记录与边界

首次打包因开发客户端占用 SQLite native 文件而失败；关闭后使用已冒烟验证的原生模块并以 `npmRebuild=false` 构建目录。electron-builder 资源编辑步骤两次返回 rcedit `Unable to commit changes`，随后以相同 rcedit 参数独立执行成功，核对 EXE 产品名/版本并实际运行验收。没有绕过签名校验或更改系统代码签名设置。

该目录是可运行的模板修复检查版，使用时保留整个 `win-unpacked` 文件夹；未生成 NSIS 安装包，未执行真实模型生成或完整项目 Word 导出。旧启动检查包不会自动补齐组件，应改用本次目录复测。用户确认继续后，已恢复下一项改造，见下文。

## 后续单步：失败诊断本地留存与手动导出

用户明确选择“本机保留脱敏诊断包，用户手动导出给内部管理员”，暂不部署公司接收服务。

- 内部发行的 reporter 跳过原作者 `/agent-errors` 预检和上传；不再依赖作者许可证或普通统计身份。非内部发行的原有许可证/接收版本/上传流程保留，Worker 和 Dashboard 未修改。
- 继续由独立 utilityProcess 读取错误现场、遮盖配置凭据和常见认证信息、压缩；完成后原子落盘到 `%APPDATA%/weipin-bid-workbench/logs/agent-failures/*.json.gz`。任务异常仍原样返回，暂停、取消和交由父任务处理的子任务沿原触发规则排除，临时任务归档仍在采集结束后清理。
- 包含错误链、Prompt、配置脱敏副本、系统信息及失败工作区文件，不将“脱敏”描述为移除业务资料。设置“通用 → 失败诊断包 → 查看与导出”明示内容范围，用户选择单包后通过原生另存为导出；没有自动发送给任何管理员。
- 诊断包持续本地保留，可通过既有存储空间“临时、缓存、日志”清理。“其他日志与失败诊断包”说明清理会删除诊断资料；不额外修改业务数据或引入定时删除。
- 关于页隐私声明改为准确说明本地配置/业务存储、员工选用的模型服务、普通匿名统计和本地失败诊断，不再使用“应用不保存 API Key/业务内容”的过宽表述。

### 验证

- `node_modules/.bin/electron.cmd scripts/check-local-agent-diagnostics.cjs`：真实 utilityProcess、独立中文工作区、无许可证/埋点ID本地生成、文本和二进制中已配置凭据脱敏、认证格式脱敏、业务内容保留、诊断解压可读、服务重建后列表恢复、暂停/取消不采集、零预检/上传请求、导出/取消和大小上限通过。
- 真实 `npm run dev` 等价启动（固定 Vite 5173 后启动 Electron），真实 preload/IPC 打开列表。用纯合成数据验证列表和 Windows 原生另存为，导出文件逐字节等于本地包，解压可读且测试凭据已遮盖。测试包只留验收副本在 `output/playwright/company-internal/诊断导出-合成验收.json.gz`，用户目录中的该测试包已精确清理。
- 使用 Playwright 检查空列表、列表和无横向溢出；Computer Use 只操作诊断包的 Windows 保存对话框。截图：`local-diagnostics-empty.png`、`local-diagnostics-list.png`。
- 改动 CJS 语法检查、TypeScript/Vite 构建、公司配置/内部发行/支持入口检查通过。既有支持检查曾在 Node 24 同步递归清理临时目录时以 1 退出，已改为等待异步清理后确认退出 0；产品逻辑未因此变更。

单包仍沿用原 95 MiB 压缩大小限制；超限或采集失败不影响任务错误返回，但不会留下完整诊断包。退出应用会结束尚未完成的采集。凭据脱敏不能保证清除压缩附件或未配置的所有秘密，交付前仍需按公司规定核对。

本轮没有调用真实付费模型、发送业务文件、重新打包安装程序、提交或推送；先前模板修复 EXE 不包含这次诊断入口。下一步在线依赖核对仅列入计划，尚未改动。

## 后续单步：公司内部版启动 IP 封禁按空名单处理

用户明确要求“请求接口不管返回什么都是空，写明白改动”。本次只改客户端启动退出策略。

- `client/electron/main.cjs` 的 `checkBlockedIpAfterStartup()` 在 `product.distribution === 'internal-manual'` 时直接返回 `{ code: 0, clientIp: '', blockedIps: [] }`，不发送 `/ip-blocks` 请求、不读取远程名单，不因作者名单终止公司版进程。注释说明原因和影响范围。
- 非内部发行分支仍保留原请求、5 秒超时和命中退出行为。没有更改作者线上名单或尝试解除任何服务端限制。
- `/track`、插件/组件下载计数、Worker 入口 IP 过滤、管理后台、D1 名单和统计聚合均保持原样。服务端仍可拒绝来自被封禁出口的请求；本次不保证被封禁出口能访问作者插件、OCR 下载等服务。
- 直接从实际 Main 源码提取函数，在隔离 VM 中检查合成的命中、未命中、无效响应和断网情形：内部版均返回空名单，网络调用和退出次数均为 0；非内部发行仍查询并在命中时调用模拟退出。
- `node --check electron/main.cjs`、`npm run build`、`git diff --check` 通过；仅既有 chunk 体积提示。`git diff --exit-code -- analytics` 确认服务端目录未变更。

未重启运行中的客户端、未重新打包 EXE、未提交或推送。Main 改动需重启开发版或重新打包后生效，已有检查版 EXE 不会自动更新。
