# 悦听 · 项目功能文档

> 版本：**0.5.0** · 最后更新：**2026-05-27**  
> 用途：功能状态跟踪、测试验收、变更记录（给开发者）  
> 用户向说明见 [README.md](../README.md) — **两处文档需随功能变更同步维护**。

---

## 一、产品定位

**悦听** 是个人使用的免费音乐播放器：

- **浏览器** 打开即用（`npm run dev` / 静态部署）
- **Android APK**（Capacitor 6 壳，`npm run android:apk`）
- 一套代码适配 **手机 / 平板 / 电视（KTV 点歌台）**

在线曲库通过 **EBNR** 接入网易云音乐（搜索、歌单、专辑、播放地址）；歌词来自 **网易云 LRC 接口**。另支持 **本地文件导入** 与少量 **演示数据** 回退。

| 项目信息 | 说明 |
|---------|------|
| 技术栈 | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Capacitor 6 |
| 包名 / App ID | `com.yueting.music` |
| 默认主题 | 深色（`#121212`），强调色为白色；支持白天/夜间切换 |
| 设备适配 | 宽度自动识别 + **我的 → 设置 → 界面模式** 可手动固定 |

### 多设备布局

| 模式 | 触发条件 | 界面特点 |
|------|----------|----------|
| **手机** | 宽度 &lt; 768px | 底部 Tab + `PlaybackBar` 迷你播放条 |
| **平板** | 768px ~ 1279px | 左侧导航 + 内容区 + 播放条 |
| **电视/KTV** | ≥ 1280px 或电视 UA | 顶栏导航 + `TvHomeScreen` 点歌台 + `TvMiniPlayer` |

---

## 二、主要入口（当前接线）

| 入口 | 位置 | 状态 | 说明 |
|------|------|------|------|
| **设置** | 我的音乐 · 右上角齿轮 | ✅ | 界面模式、主题、自动下一首、定时停止、关于 |
| **播放队列** | 迷你播放条 / 播放详情 | ✅ | 列表切歌、移除、清空；持久化 |
| **歌曲菜单** | 播放详情 · 更多 | ✅ | 加入队列、下一首播放、加歌单、删本地文件等 |

### 已下线 / 未接线（代码仍存在）

| 入口 | 原设计 | 状态 | 说明 |
|------|--------|------|------|
| **通知铃铛** | 发现页右上角 | ⬜ 未接线 | `NotificationsPanel` + `mockData` 通知，无页面引用 |
| **查看全部** | 每日推荐标题旁 | ⬜ 未接线 | `DailyRecommendScreen` 展示 mock 歌单，无页面引用 |
| **发现页设置** | 发现页右上角 | ⬜ 已移除 | 设置仅在「我的」页 |
| **搜索分类筛选** | 搜索页芯片 | ⬜ 未接线 | `filterSongs` 支持 genre，搜索流程未使用 |
| **LocalMusicPanel** | 独立面板组件 | ⬜ 已弃用 | 由 `LocalMusicDetailScreen` 替代 |

---

## 三、功能总览（按状态）

图例：**✅ 已完成** · **🟡 部分完成** · **⬜ 未开发 / 未接线**

### 3.1 导航与框架

| 功能 | 状态 | 说明 |
|------|------|------|
| 浏览器直接访问 | ✅ | `npm run dev` / `preview` / 静态 `dist` |
| Android APK（debug） | ✅ | `npm run android:apk` → `release/悦听-debug.apk` |
| 手机 / 平板 / 电视布局 | ✅ | `DeviceContext` + 三套 Layout |
| Tab：首页 / 搜索 / 我的 | ✅ | `ScreenRouter` + `TabPanel` **保活** |
| 迷你播放条 `PlaybackBar` | ✅ | 有曲时播放控制；无曲时队列入口 + 角标 |
| 全屏播放详情 `PlayerScreen` | ✅ | 封面、歌词、进度、模式、队列入口 |
| 白天 / 夜间主题 | ✅ | `ThemeContext` + `light.css` |
| TV 点歌台首页 | 🟡 | 布局完成；部分歌单仍用 **mock** 数据 |

### 3.2 首页（发现）

| 功能 | 状态 | 说明 |
|------|------|------|
| 时段问候语 | ✅ | 早上好 / 下午好 / 晚上好 |
| 网易云热榜 | ✅ | 热歌 / 飙升 / 原创 / 新歌 → `NeteasePlaylistDetailScreen` |
| 每日推荐（横向歌单） | ✅ | EBNR 精选池 + 可播放探测 |
| 推荐专辑 | ✅ | `NeteaseAlbumDetailScreen` |
| 推荐音乐 + 换一换 | ✅ | 多歌单池；失败回退 **最近播放** |
| 首页预取 | ✅ | `useNeteaseHomePrefetch` |
| 最近播放列表（首页区块） | ⬜ | 仅在「我的」展示 |
| 通知 / 设置 / 查看全部 | ⬜ | 见第二节 |

### 3.3 搜索页

| 功能 | 状态 | 说明 |
|------|------|------|
| 搜索框 + 提交 | ✅ | 打开 `SearchResultsScreen` |
| EBNR 在线搜索 | ✅ | `useEbnrSearch`，可播放性过滤 |
| 热搜词芯片 | ✅ | `HOT_SEARCH_KEYWORDS` |
| 热门音乐 + 换一换 | ✅ | `useNeteaseHotSongs`；失败回退最近播放 |
| 本地搜索回退 | ✅ | mock + 本地导入 + 已缓存网易云曲 |
| 流派 / 分类筛选 UI | ⬜ | 无界面 |

### 3.4 我的音乐

| 功能 | 状态 | 说明 |
|------|------|------|
| 我喜欢的音乐 | ✅ | 收藏 localStorage；封面 = **最后收藏** 曲专辑图 |
| 本地音乐导入 | ✅ | IndexedDB；`LocalMusicDetailScreen` |
| 我的歌单 CRUD | ✅ | `useUserPlaylists` + `PlaylistEditorPanel` |
| 最近播放 | ✅ | `RecentPlaysContext` |
| 设置面板 | ✅ | 见「设置项明细」 |

### 3.5 播放器

| 功能 | 状态 | 说明 |
|------|------|------|
| HTML5 真实播放 | ✅ | `useAudioPlayer` |
| 网易云播放地址解析 | ✅ | EBNR `/audio` + 内存缓存 |
| 播放 / 暂停 | ✅ | 迷你栏 + 详情页 |
| 进度条 + 拖动 seek | ✅ | 失败时暂停并停止进度虚假走动 |
| 上一首 / 下一首 | ✅ | 队列逻辑；&gt;3s 时上一首从头 |
| 播放模式四档 | ✅ | 列表循环 → 单曲循环 → 顺序 → 随机 |
| 自动下一首 | ✅ | 设置开关；与 `list` 模式「播完即停」配合 |
| 播放队列面板 | ✅ | 增删清空、点选切歌；localStorage；上限 500 |
| 网易云 LRC 歌词 | ✅ | 内联 5 行；歌词设置（居中 / 左右交替） |
| 收藏（红心） | ✅ | 与「我喜欢的音乐」同步 |
| 定时停止 | ✅ | 15/30/45/60/90 分钟或播完当前首 |
| 播放错误 Toast | ✅ | `PlaybackErrorToast`，居中胶囊，约 6 秒消失 |
| 演示静态歌词 | ⬜ | `lyricsTracks` 已清空，仅网易云 LRC |

### 3.6 数据与 API

| 功能 | 状态 | 说明 |
|------|------|------|
| EBNR 在线 API | ✅ | 搜索、音频、歌单、专辑 |
| 网易云歌词 API | ✅ | `apis.netstart.cn` |
| Vite 开发代理 | ✅ | `/api/ebnr`、`/api/netease-lyric` |
| Capacitor 直连（APK） | ✅ | `.env.capacitor` + `CapacitorHttp` |
| 本地音乐 IndexedDB | ✅ | |
| TTL / 可播放探测缓存 | ✅ | 热榜、推荐、音频 URL 等 |
| mock 演示曲 / 歌单 | 🟡 | 仍并入曲库；TV 首页、死代码页面使用 |
| 用户登录 / 云同步 | ⬜ | |
| 正式签名 Release APK | ⬜ | 仅 debug 流程 |

### 设置项明细（`SettingsPanel`）

| 分组 | 项 | 状态 |
|------|-----|------|
| 界面 | 自动 / 手机 / 平板 / 电视 | ✅ |
| 外观 | 夜间 / 白天模式 | ✅ |
| 播放 | 自动播放下一首 | ✅ |
| 播放 | 定时停止（分钟 / 播完当前首 / 关闭） | ✅ |
| 关于 | 应用名、版本 0.5.0 | ✅ |

---

## 四、页面结构图（当前）

```
悦听 App
├── Tab 保活层（ScreenRouter）
│   ├── 首页（发现）
│   │   ├── 网易云热榜 → 歌单详情 [Overlay]
│   │   ├── 每日推荐歌单 → 歌单详情 [Overlay]
│   │   ├── 推荐专辑 → 专辑详情 [Overlay]
│   │   └── 推荐音乐列表
│   ├── 搜索
│   │   ├── 热搜 / 热门音乐
│   │   └── 搜索结果 [Overlay]
│   └── 我的音乐
│       ├── 我喜欢的 → 歌单详情 [Overlay]
│       ├── 本地音乐 → 本地详情 [Overlay]
│       ├── 我的歌单 → 详情 / 编辑器 [Overlay]
│       ├── 最近播放
│       └── 设置 [Overlay]
├── PlaybackBar（全局）
├── PlayerScreen（全屏播放）[Overlay]
├── QueuePanel（播放队列）[Overlay]
├── LyricsSettingsPanel [Overlay]
└── SongActionSheet [Overlay]

未接线：NotificationsPanel、DailyRecommendScreen
```

---

## 五、测试清单（验收用）

复制到测试记录，通过项打 `x`。**需先 `npm run dev`**（或安装 APK）以保证 API 可用。

```markdown
### 首页
- [ ] 热榜四个入口可打开歌单并播放
- [ ] 每日推荐、推荐专辑横向滚动可进入详情
- [ ] 「推荐音乐」可播放；「换一换」可刷新列表
- [ ] 断网或停 dev 时，推荐区有合理错误/回退提示

### 搜索
- [ ] 输入关键词提交后出现在线结果
- [ ] 热搜词点击可搜索
- [ ] 「热门音乐」可播放；「换一换」有效
- [ ] 在线无结果时，本地曲库可匹配（含已导入文件）

### 我的音乐
- [ ] 收藏歌曲后「我喜欢的音乐」封面更新为最后收藏曲封面
- [ ] 导入本地音频，刷新后仍可播放
- [ ] 新建 / 编辑 / 删除自建歌单
- [ ] 设置：切换界面模式、白天/夜间主题
- [ ] 设置：关闭「自动下一首」后单曲播完不自动切歌
- [ ] 设置：定时 15 分钟 / 播完当前首 可停止播放

### 播放
- [ ] 点歌可出声；迷你栏与详情页进度一致
- [ ] 详情页：暂停、上一首/下一首、拖动进度
- [ ] 播放模式四档切换符合预期（循环/单曲/顺序/随机）
- [ ] 打开播放队列：切歌、移除、清空
- [ ] 网易云歌曲显示 LRC 歌词（dev 代理或 APK）
- [ ] 无法播放时仅一条居中错误提示，暂停后进度条不走动

### Android APK（可选）
- [ ] `npm run android:apk` 成功生成 `release/悦听-debug.apk`
- [ ] 安装后可搜索、播放、显示歌词（无需电脑 dev）
```

---

## 六、已知限制

- 部分歌曲 EBNR 无法返回播放地址（接口/版权）
- 纯静态部署无反向代理时，在线数据与歌词不可用
- 电视首页与手机首页数据源不一致（TV 仍含 mock 歌单）
- 搜索在线结果以歌曲为主；歌手/专辑聚合仅本地回退时有
- 第三方 API 可用性不在本项目控制范围内

---

## 七、后续规划（Roadmap）

| 优先级 | 功能 | 状态 |
|--------|------|------|
| P0 | 网易云在线播放（EBNR） | ✅ |
| P0 | 播放队列持久化 | ✅ |
| P1 | 歌词 LRC | ✅ |
| P1 | 播放模式 / 收藏 / 本地导入 | ✅ |
| P1 | 歌单 CRUD | ✅ |
| P2 | Tab 保活 | ✅ |
| P2 | Capacitor Android debug APK | ✅ |
| P3 | 清理死代码（通知、每日推荐全部页） | ⬜ |
| P3 | TV 首页统一网易云数据源 | ⬜ |
| P3 | 正式签名 Release / 上架 | ⬜ |
| P3 | 用户账号与云同步 | ⬜ |

---

## 八、目录说明（给开发者）

```
d:\Test\
├── README.md                      # 用户向：功能清单、启动、打包
├── docs/PROJECT.md                # 本文档
├── release/悦听-debug.apk           # 打包输出（git 忽略）
├── android/                       # Capacitor Android 工程
├── capacitor.config.ts
├── vite.config.ts                 # dev/preview API 代理
├── .env.capacitor                 # APK 直连 API
├── src/
│   ├── screens/                   # HomeScreen, SearchScreen, LibraryScreen, PlayerScreen…
│   ├── components/                # PlaybackBar, QueuePanel, InlineLyrics, SettingsPanel…
│   ├── context/                   # PlayerContext, FavoritesContext, ThemeContext…
│   ├── hooks/                     # useAudioPlayer, useNeteaseHotSongs, useSongLyrics…
│   ├── api/                       # ebnr.ts, neteaseLyric.ts
│   ├── utils/                     # neteaseSong, playbackQueue, lrcParse…
│   └── data/                      # mockData（演示）, neteaseCharts…
└── package.json                   # android:apk, build:app 等脚本
```

### 关键模块索引

| 模块 | 路径 |
|------|------|
| 播放状态 | `src/context/PlayerContext.tsx` |
| 音频引擎 | `src/hooks/useAudioPlayer.ts` |
| 队列持久化 | `src/utils/playbackQueue.ts` |
| 网易云 URL | `src/utils/neteaseSong.ts` |
| EBNR 请求 | `src/api/ebnr.ts` |
| 歌词 | `src/api/neteaseLyric.ts` + `src/hooks/useSongLyrics.ts` |
| Tab 保活 | `src/components/ScreenRouter.tsx` |

---

## 九、变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-25 | 0.1.0 | 初版：UI 原型 + HTML5 播放 |
| 2026-05-25 | 0.1.1 | 通知 / 设置 / 查看全部（后两项首页已移除接线） |
| 2026-05-25 | 0.2.0 | 多设备：手机 / 平板 / 电视布局 |
| 2026-05-25 | 0.3.0 | 搜索、队列、播放模式、收藏、歌词、Tab 默认手机 |
| 2026-05-25 | 0.4.0 | 本地音乐 IndexedDB；歌单 CRUD；自动下一首修复 |
| 2026-05-27 | 0.5.0 | 接入 EBNR 网易云；热榜/推荐/搜索；LRC 歌词；Tab 保活；Capacitor APK；播放错误与进度修复；文档与 README 对齐 |

---

**维护约定**：功能增删改时，请同步更新 **第三节状态表**、**第五节测试清单**、**第九节变更记录**，并更新 [README.md](../README.md) 中的「功能清单」。
