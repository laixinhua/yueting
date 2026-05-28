#Requires -Version 5.1
param(
  [string]$Version = "",
  [string]$Repo = "laixinhua/yueting",
  [switch]$SkipBuild,
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $old = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & git @GitArgs
  $code = $LASTEXITCODE
  $ErrorActionPreference = $old
  return $code
}

function Get-AppVersionTag {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $raw = [string]$pkg.version
  if (-not $raw) { throw "package.json version is empty" }
  if ($raw.StartsWith("v")) { return $raw }
  return "v$raw"
}

function Get-GitOriginUrl {
  Invoke-Git remote get-url origin | Out-Null
  if ($LASTEXITCODE -ne 0) { return $null }
  $old = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $url = git remote get-url origin 2>$null
  $ErrorActionPreference = $old
  return $url
}

function Ensure-GhAuth {
  $old = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  gh auth status 2>$null | Out-Null
  $ErrorActionPreference = $old
  if ($LASTEXITCODE -ne 0) {
    Write-Host "请先登录 GitHub CLI: gh auth login" -ForegroundColor Yellow
    Write-Host "登录后运行: npm run android:release" -ForegroundColor Yellow
    exit 1
  }
}

if (-not $Version) {
  $Version = Get-AppVersionTag
}

Ensure-GhAuth

$apkAsset = "release/yueting-debug.apk"
if (-not $SkipBuild -and -not (Test-Path $apkAsset)) {
  Write-Host "Building APK..."
  npm run android:apk
}

if (-not (Test-Path $apkAsset)) {
  Write-Host "APK not found: $apkAsset" -ForegroundColor Red
  Write-Host "Run: npm run android:apk" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".git")) {
  Invoke-Git init -b main | Out-Null
}

if (-not $SkipPush) {
  $remote = Get-GitOriginUrl
  if (-not $remote) {
    $repoName = if ($Repo -match "/") { ($Repo -split "/")[-1] } else { $Repo }
    Write-Host "Creating GitHub repo and pushing..."
    gh repo create $repoName --public --source=. --remote=origin --push --description "Yueting music player"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } else {
    Invoke-Git add --all | Out-Null
    Invoke-Git diff --cached --quiet | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Invoke-Git commit -m "chore: release $Version" | Out-Null
    }
    Invoke-Git push -u origin HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Invoke-Git push -u origin main | Out-Null
    }
    if ($LASTEXITCODE -ne 0) {
      Write-Host "git push failed" -ForegroundColor Red
      exit $LASTEXITCODE
    }
  }
}

$notes = @"
## 悦听 $Version

下载 \`yueting-debug.apk\` 安装到 Android 手机（debug 包，仅供自测）。

### 更新说明
- 修复锁屏后不切下一首、切歌后不自动播放、点播放先播上一首开头等问题
- 播放队列/切歌逻辑改用 ref，避免后台状态下状态过期
- 亮屏后自动重试被浏览器拦截的自动播放
"@

$old = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
gh release view $Version --repo $Repo 2>$null | Out-Null
$releaseExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $old

if ($releaseExists) {
  gh release upload $Version $apkAsset --repo $Repo --clobber
} else {
  gh release create $Version $apkAsset --repo $Repo --title "悦听 $Version" --notes $notes
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$json = gh release view $Version --repo $Repo --json url,assets | ConvertFrom-Json
Write-Host ""
Write-Host "Release URL:" -ForegroundColor Green
Write-Host $json.url
Write-Host ""
Write-Host "APK download (open on phone):" -ForegroundColor Green
foreach ($asset in $json.assets) {
  if ($asset.name -like "*.apk") {
    $apkUrl = if ($asset.browser_download_url) { $asset.browser_download_url } else { $asset.url }
    Write-Host $apkUrl
    Write-Host ""
    Write-Host "Mirror (if GitHub is slow in CN):" -ForegroundColor Yellow
    Write-Host ("https://ghproxy.net/{0}" -f $apkUrl)
  }
}
