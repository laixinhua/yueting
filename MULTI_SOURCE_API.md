# 多源音乐API集成文档

## 🎯 概述

悦听音乐播放器现在集成了多个免费的音乐API源，大大增加了可搜索和播放的歌曲数量。

## 📡 支持的API源

| 音乐平台 | 状态 | 功能 | 颜色标识 |
|---------|------|------|---------|
| 网易云音乐 (EBNR) | ✅ 核心源 | 搜索、播放、歌单、热榜 | 红色 |
| QQ音乐 | ✅ 已集成 | 搜索、热门歌曲、播放地址 | 蓝色 |
| 酷狗音乐 | ✅ 已集成 | 搜索、热门歌曲、播放地址 | 绿色 |

## 🔧 技术实现

### 1. 多源搜索聚合器 (src/api/musicAggregator.ts)

**主要职责：**
- 并发查询多个音乐API
- 结果去重和合并
- 按相关度排序
- 错误处理和回退

**关键功能：**
```typescript
// 搜索所有源
const result = await searchAllMusic('周杰伦', 50)

// 获取混合热门歌曲
const hotSongs = await getHotSongsFromAll(100)

// 获取多源歌曲播放URL
const playUrl = await getPlayUrlForSong(song)
```

### 2. QQ音乐API (src/api/qqMusic.ts)

**支持的功能：**
- 歌曲搜索
- 热门歌曲
- 播放地址获取
- 歌曲详情查询

**技术特点：**
- 免费API，无需认证
- 支持高音质链接
- 有良好的歌曲元数据

### 3. 酷狗音乐API (src/api/kugouMusic.ts)

**支持的功能：**
- 歌曲搜索
- 热门歌曲榜单
- 多音质播放地址
- 歌词信息

**技术特点：**
- 多种音质选择(128k/320k)
- 丰富的热门榜单
- 智能搜索建议

### 4. 音乐下载功能 (src/api/musicDownload.ts)

**主要功能：**
- 多任务下载管理
- 断点续传
- 进度监控
- IndexedDB本地存储
- 文件另存为

### 5. 新的React Hooks

#### useMusicSearch.ts
```typescript
const { songs, loading, error, sources } = useMusicSearch(keyword)
// 多源搜索结果，自动选择最佳结果
```

#### useMultiSourceHotSongs.ts
```typescript
const { songs, loading, error, refresh } = useMultiSourceHotSongs()
// 混合多个源的热门歌曲，去重后提供统一列表
```

#### useMusicDownload.ts
```typescript
const { 
  downloadTasks, 
  downloadSong, 
  pauseDownload,
  resumeDownload 
} = useMusicDownload()
// 完整的下载管理功能
```

## 🎨 UI组件更新

### MultiSourceSearchResults 组件
- 支持多源结果切换显示
- 显示数据来源标记
- 结果数量统计
- 错误状态处理

### ApiTestPanel 组件
- API功能测试
- 实时状态监控
- 搜索测试
- 下载管理

## 🚀 使用方法

### 1. 基本搜索
```typescript
import { searchAllMusic } from '../api/musicAggregator'

const result = await searchAllMusic('周杰伦', 30)
console.log(`找到 ${result.totalCount} 首歌曲，来自 ${result.sources.join(', ')}`)
```

### 2. 在React组件中使用
```tsx
import { useMusicSearch } from '../hooks/useMusicSearch'

function SearchComponent() {
  const { songs, loading, sources } = useMusicSearch(keyword)
  
  return (
    <div>
      <div>数据来源: {sources.join(', ')}</div>
      {songs.map(song => (
        <SongItem song={song} />
      ))}
    </div>
  )
}
```

### 3. 下载歌曲
```tsx
import { useMusicDownload } from '../hooks/useMusicDownload'

function DownloadComponent() {
  const { downloadSong, downloadTasks } = useMusicDownload()
  
  const handleDownload = async (song) => {
    await downloadSong(song)
  }
  
  return (
    <button onClick={() => handleDownload(song)}>
      下载 ({downloadTasks.length} 任务中)
    </button>
  )
}
```

## 📊 性能优化

1. **并发搜索**: 使用 Promise.all 并行查询多个API
2. **结果缓存**: 缓存热门歌曲和搜索结果
3. **错误回退**: 单个API失败不影响其他源
4. **智能去重**: 基于歌名+歌手名去重
5. **按需加载**: 只加载显示需要的数据

## 🎯 用户体验提升

### 搜索方面
- 🎵 **更多选择**: 同时搜索3个平台的歌典
- 🎯 **更好结果**: 智能排序，相关度更高的排前面
- 🔄 **无缝体验**: 即使某个平台服务不可用，其他平台仍可用

### 播放方面
- 🎧 **更高音质**: QQ音乐和酷狗音乐提供高质量音源
- 📻 **更多来源**: 同一首歌可能有多个播放源可选
- ⚡ **更快获取**: 多源同时查询，取最快响应的

### 下载方面
- 💾 **批量下载**: 支持多任务并行下载
- 📱 **本地存储**: 歌曲保存到本地IndexedDB
- 🔄 **断点续传**: 下载中断后可继续

## 🔨 开发注意事项

1. **API限制**: 部分API可能有调用频率限制
2. **错误处理**: 必须妥善处理各个API的错误情况
3. **数据格式**: 统一各个API返回的数据格式
4. **版权合规**: 仅用于个人学习和测试

## 🚀 未来扩展计划

- [ ] 更多音乐平台集成（如酷我音乐、虾米音乐）
- [ ] AI智能推荐算法
- [ ] 个性化歌单生成
- [ ] 歌词多语言翻译
- [ ] 音乐质量评估和推荐
- [ ] P2P音乐共享（局域网内）

## 📝 版本更新

### v0.6.0 - 多源API集成
- 🎉 新增QQ音乐API支持
- 🎉 新增酷狗音乐API支持  
- 🎉 多源搜索结果聚合
- 🎉 混合热门歌曲列表
- 🎉 多源下载管理
- 🎉 新搜索UI组件
- 🎉 API测试面板

---

*多源音乐API集成完成，为用户提供了更加丰富和稳定的音乐体验！🎵*