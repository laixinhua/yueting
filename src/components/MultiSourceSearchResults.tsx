import { useState } from 'react'
import type { Song } from '../types'
import { useMusicSearch, getSourceDisplayName, getSourceIconClass } from '../hooks/useMusicSearch'
import { useEbnrSearch } from '../hooks/useEbnrSearch'
import { SongRow } from './SongRow'
import { formatDuration } from '../data/mockData'

interface MultiSourceSearchResultsProps {
  keyword: string
  enabled?: boolean
  onSongSelect?: (song: Song) => void
  showSourceIndicator?: boolean
}

export function MultiSourceSearchResults({
  keyword,
  enabled = true,
  onSongSelect,
  showSourceIndicator = true
}: MultiSourceSearchResultsProps) {
  const [selectedTab, setSelectedTab] = useState<'aggregated' | 'netease'>('aggregated')
  
  // 多源搜索结果
  const {
    songs: aggregatedSongs,
    loading: aggregatedLoading,
    error: aggregatedError,
    sources: aggregatedSources,
    totalCount,
    hasMore
  } = useMusicSearch(keyword, enabled && selectedTab === 'aggregated')
  
  // 网易云单独搜索（用于对比）
  const {
    songs: neteaseSongs,
    loading: neteaseLoading,
    error: neteaseError
  } = useEbnrSearch(keyword, enabled && selectedTab === 'netease')
  
  // 显示结果
  if (!keyword.trim()) {
    return null
  }
  
  const displaySongs = selectedTab === 'aggregated' ? aggregatedSongs : neteaseSongs
  const isLoading = selectedTab === 'aggregated' ? aggregatedLoading : neteaseLoading
  const error = selectedTab === 'aggregated' ? aggregatedError : neteaseError
  
  return (
    <div className="w-full space-y-4">
       {/* 搜索源选择器 */}
        <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('aggregated')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedTab === 'aggregated'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            多源聚合搜索 ({totalCount})
          </button>
        </div>
      
      {/* 多源指示器 */}
      {selectedTab === 'aggregated' && showSourceIndicator && aggregatedSources.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-gray-400">数据源：</span>
          {aggregatedSources.map((source) => (
            <span
              key={source}
              className="px-2 py-1 bg-gray-700 text-gray-200 rounded-full text-xs"
            >
              {source}
            </span>
          ))}
        </div>
      )}
      
      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <p className="mt-2 text-gray-400">搜索中...</p>
        </div>
      )}
      
      {/* 错误状态 */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️ {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            重试
          </button>
        </div>
      )}
      
      {/* 歌曲列表 */}
      {!isLoading && !error && displaySongs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">未找到相关歌曲</p>
          <p className="text-gray-500 text-sm mt-1">试试其他关键词？</p>
        </div>
      )}
      
      {!isLoading && !error && displaySongs.length > 0 && (
        <div className="space-y-2">
          {/* 表头 */}
          <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <span className="w-8">#</span>
              <span className="flex-1">歌曲</span>
            </div>
            {selectedTab === 'aggregated' && (
              <div className="w-12 text-center">来源</div>
            )}
            <div className="w-16 text-center">时长</div>
          </div>
          
          {/* 歌曲列表 */}
          {displaySongs.map((song, index) => (
            <div
              key={`${song.source || 'netease'}-${song.id}-${index}`}
              className="group hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <SongRow
                song={song}
                index={index}
                onClick={() => onSongSelect?.(song)}
              />
              
              {/* 自定义来源显示 */}
              {selectedTab === 'aggregated' && showSourceIndicator && (
                <div className="flex items-center justify-between px-4 py-1">
                  <div className="flex-1 ml-12">
                    {song.source && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full bg-gradient-to-r ${getSourceIconClass(song)} text-white font-medium`}>
                        {getSourceDisplayName(song)}
                      </span>
                    )}
                  </div>
                  <div className="w-16 text-center text-gray-400 text-sm">
                    {formatDuration(song.duration)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* 更多结果提示 */}
          {selectedTab === 'aggregated' && hasMore && (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">
                还有更多结果，但目前仅显示 {displaySongs.length} 首歌曲
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}