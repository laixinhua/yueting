# 悦听 - 音乐播放器

个人使用的免费音乐播放器。支持 **浏览器** 直接打开，也可打包为 **Android APK** 安装到手机。一套代码自动适配 **手机 / 平板 / 电视（KTV 点歌台）** 三种界面。

> **文档维护**：新增、修改或删除功能时，请同步更新本文 **「功能清单」** 与 **「常用命令」** 两节。详细开发进度与测试项见 [docs/PROJECT.md](./docs/PROJECT.md)（该文件也需随版本一并维护）。

---

## 功能清单（当前版本）

### 导航与框架

| 功能 | 说明 |
|------|------|
| 三栏 Tab | 首页 / 搜索 / 我的；切换 Tab **不重新加载**（`ScreenRouter` 保活） |
| 多设备布局 | 手机（底栏 + 迷你播放条）、平板（侧栏）、电视/KTV（顶栏 + 大按钮点歌台） |
| 界面模式 | **我的 → 设置** 可选手动固定手机/平板/电视，或跟随窗口宽度自动识别 |
| 主题 | 夜间 / 白天模式（设置内切换） |
| 全局播放条 | 有曲目时显示迷你播放器；无曲目时显示 **播放队列** 入口与数量角标 |

### 首页（发现）

| 功能 | 说明 |
|------|------|
| 时段问候 | 早上好 / 下午好 / 晚上好 |
| 网易云热榜 | 热歌榜、飙升榜、原创榜、新歌榜；点击进入歌单详情并播放 |
| 每日推荐 | 横向网易云歌单（EBNR 精选池 + 可播放探测） |
| 推荐专辑 | 横向专辑卡片，进入专辑详情 |
| 推荐音乐 | 多歌单合并推荐，支持 **换一换**；失败时回退为「最近播放」 |

> 首页 **无** 通知铃铛、设置入口、「查看全部」入口（设置仅在「我的」页）。

### 搜索

| 功能 | 说明 |
|------|------|
| 关键词搜索 | 提交后打开全屏结果页 |
| 在线搜索 | 通过 **EBNR** 搜索网易云歌曲，结果经可播放性过滤 |
| 热搜词 | 点击芯片直接搜索 |
| 热门音乐 | 热歌 / 飙升 / 新歌榜合并展示，支持 **换一换** |
| 本地回退 | 在线无结果时，在本地曲库（导入音乐 + 已缓存网易云曲 + 演示曲）中匹配 |

### 我的音乐

| 功能 | 说明 |
|------|------|
| 我喜欢的音乐 | 收藏列表；封面取 **最后收藏** 一曲的专辑图，无收藏时为灰底爱心 |
| 本地音乐 | 选择 MP3 / FLAC / WAV 等导入，**IndexedDB** 持久化 |
| 我的歌单 | 自建歌单 **新建 / 编辑 / 删除**，localStorage 持久化 |
| 最近播放 | 列表展示，点击播放 |
| 设置 | 右上角齿轮 → 播放、界面、外观、定时停止等 |

### 播放器

| 功能 | 说明 |
|------|------|
| 在线播放 | 网易云歌曲经 EBNR 解析播放地址；本地文件走浏览器 blob URL |
| 播放 / 暂停 | 迷你播放条 + 全屏播放详情 |
| 进度条 | 实时更新；详情页可拖动跳转 |
| 上一首 / 下一首 | 按播放队列；进度 &gt; 3 秒时「上一首」从头播放 |
| 播放模式 | 列表循环 / 单曲循环 / 顺序 / 随机（四档切换） |
| 自动下一首 | 设置内可关闭 |
| 播放队列 | 查看、点选切歌、移除、清空；**localStorage** 持久化，上限 500 首 |
| 加入队列 | 歌曲菜单：加入队列、下一首播放等 |
| 歌词 | 网易云 **LRC** 内联滚动（5 行窗口）；歌词设置（居中 / 左右交替） |
| 收藏 | 播放详情页红心，与「我喜欢的音乐」同步 |
| 定时停止 | 15 / 30 / 45 / 60 / 90 分钟，或播完当前首 |
| 错误提示 | 底部居中胶囊 Toast（如「未获取到播放地址」），约 6 秒自动消失 |

### 数据与接口

| 来源 | 用途 |
|------|------|
| **EBNR** | 搜索、播放地址、歌单、专辑（`https://ebnr.xiyang6666.top`） |
| **网易云歌词** | LRC 文本（`apis.netstart.cn`） |
| **本地导入** | 用户选择的音频文件 |
| **演示数据** | `mockData` 仍保留少量 SoundHelix 演示曲，供本地搜索回退；电视首页部分区块仍用演示歌单 |

开发环境下，EBNR 与歌词走 Vite 代理（见下方「环境变量」）。**APK** 构建时直连公网 API（`.env.capacitor`）。

### 已知限制 / 未实现

- 无用户登录、云同步、正式签名上架包
- 部分歌曲可能无法解析播放地址（版权或接口限制）
- 歌词 / 首页数据在 **未启动 dev 代理** 的纯静态部署下可能不可用
- 电视模式「推荐歌单」与手机首页数据源不完全一致（仍含演示歌单）
- 搜索页无流派分类筛选 UI

---

## 多设备预览

| 方式 | 效果 |
|------|------|
| 浏览器默认宽度 | 手机布局 |
| 窗口宽度 ≥ 768px | 平板布局（左侧导航） |
| 窗口宽度 ≥ 1280px | 电视 / KTV 布局 |
| 我的 → 设置 → 界面模式 | 可手动固定为手机 / 平板 / 电视 |

---

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Capacitor 6（Android 壳）
- HTML5 Audio + 网易云（EBNR）在线曲库

---

## 运行（浏览器）

```bash
npm install
npm run dev
```

终端出现 `ready` 后打开：

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:5173/ | 最稳定，优先使用 |
| http://localhost:5173/ | 本机浏览器 |
| 终端 `Network:` 一行 | 手机 / 平板与电脑 **同一 WiFi** 时访问 |

代理说明：`npm run dev` 会将 `/api/ebnr`、`/api/netease-lyric` 转发到对应公网服务，**在线搜索、播放、歌词依赖此代理**。

连接失败时：关闭旧终端中的 dev 进程后重试，或：

```bash
npm run build
npm run preview
```

再打开 http://127.0.0.1:4173/（preview 同样带 API 代理）。

---

## 打包 Android APK

已集成 **Capacitor 6**，可将 Web 应用打成 APK 安装到手机。APK 内 **直连** EBNR 与歌词 API，不依赖电脑上的 `npm run dev`。

### 环境要求

- Node.js 18+
- **JDK 17**（`JAVA_HOME` 指向 jdk-17）
- **Android SDK**（需已安装 **Android SDK Platform 36**，且 `platforms/android-36/android.jar` 存在）

### 一键打包并发布（推荐）

先登录 GitHub CLI（只需一次）：

```bash
gh auth login
```

打包 APK 并同步到 GitHub Releases（版本号取自 `package.json`）：

```bash
npm install
npm run android:release
```

成功后终端会输出 **Release 页面** 和 **APK 直链**，手机浏览器打开直链即可下载安装。

> 发新版前请先把 `package.json` 里的 `version` 改成新版本（如 `0.5.2`），再执行 `npm run android:release`。

### 仅本地打包（不上传 GitHub）

```bash
npm run android:apk
```

| 输出路径 | 说明 |
|----------|------|
| `release/yueting-debug.apk` | 便于传到手机的调试包 |
| `android/app/build/outputs/apk/debug/app-debug.apk` | Gradle 原始输出 |

### 安装到手机

1. 将 `release/yueting-debug.apk` 传到手机，或从 GitHub Releases 直链下载
2. 允许「安装未知来源应用」
3. 安装并打开「悦听」

> 当前为 **debug 未签名包**，仅供自测。上架需配置签名后构建 Release。

修改代码后重新打包发布：`npm run android:release`  
仅本地调试包：`npm run android:apk`  
用 Android Studio 打开工程：`npm run android:open`

### 仅上传已有 APK 到 GitHub

若已执行过 `android:apk`，可单独上传：

```bash
npm run release:github
```

默认仓库 `laixinhua/yueting`。若需指定：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/publish-github-release.ps1 -Repo 你的用户名/仓库名
```

### 国内下载慢怎么办？

GitHub 服务器在海外，**5MB 的 APK 在手机上直连 GitHub 经常只有几十 KB/s**，属于正常现象，不是包有问题。

**推荐做法（按速度从快到慢）：**

| 方式 | 说明 |
|------|------|
| **电脑下载 + 传手机** | 电脑用浏览器或 IDM 下 `release/yueting-debug.apk`，再用微信/数据线传到手机（最稳） |
| **代理加速链接** | 在官方直链前加镜像前缀（第三方服务，可用性不保证） |
| **同一 WiFi 预览** | 开发阶段用 `npm run dev`，手机访问电脑局域网地址，不必每次下 APK |

当前版本 **v0.5.4** 链接：

| 类型 | 地址 |
|------|------|
| 官方直链 | https://github.com/laixinhua/yueting/releases/download/v0.5.4/yueting-debug.apk |
| 加速镜像（可试） | https://ghproxy.net/https://github.com/laixinhua/yueting/releases/download/v0.5.4/yueting-debug.apk |
| Release 页 | https://github.com/laixinhua/yueting/releases/tag/v0.5.4 |

若镜像也慢，优先用 **电脑下载后微信发文件** 到手机安装。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（含 API 代理） |
| `npm run build` | 生产 Web 构建 |
| `npm run preview` | 预览生产构建（含代理） |
| `npm run build:app` | 为 Capacitor 构建 Web 资源（`--mode capacitor`） |
| `npm run cap:sync` | 构建并同步到 Android 工程 |
| `npm run android:apk` | 同步 + 编译 debug APK + 复制到 `release/`（不上传） |
| `npm run android:release` | 打包 APK + 推送代码 + 发布 GitHub Release |
| `npm run release:github` | 仅上传 `release/yueting-debug.apk` 到 GitHub |
| `npm run android:open` | 用 Android Studio 打开 |
| `npm run lint` | ESLint 检查 |

---

## 环境变量

| 文件 | 场景 |
|------|------|
| `.env.capacitor` | APK 构建：直连 `VITE_EBNR_BASE`、`VITE_NETEASE_LYRIC_BASE` |
| `.env.example` | 示例；生产 Web 若自建反向代理可配置 `VITE_EBNR_BASE` |

默认开发地址：

- EBNR 代理：`/api/ebnr` → `https://ebnr.xiyang6666.top`
- 歌词代理：`/api/netease-lyric` → `https://apis.netstart.cn/music`

---

## 项目结构（简要）

```
d:\Test\
├── README.md                 ← 本文（功能说明与启动方式）
├── docs/PROJECT.md           ← 详细功能表、测试清单、变更记录
├── release/                  ← 打包输出的 APK（git 忽略）
├── android/                  ← Capacitor Android 工程
├── src/
│   ├── screens/              # 首页、搜索、我的、播放详情等
│   ├── components/           # 播放条、队列、歌词、设置等
│   ├── context/              # 播放、收藏、歌单、设备、主题
│   ├── hooks/                # 网易云数据、音频、歌词
│   └── api/                  # EBNR、歌词请求
├── capacitor.config.ts
└── vite.config.ts            # 开发 / 预览代理
```

---

## 相关文档

- [docs/PROJECT.md](./docs/PROJECT.md) — 功能状态表、验收测试清单、版本变更记录（请与代码保持同步）
