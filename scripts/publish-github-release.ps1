#Requires -Version 5.1
param(
  [string]$Version = "v0.5.0",
  [string]$Repo = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Ensure-GhAuth {
  gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "请先登录 GitHub： gh auth login" -ForegroundColor Yellow
    Write-Host "登录完成后重新运行： npm run release:github" -ForegroundColor Yellow
    exit 1
  }
}

Ensure-GhAuth

if (-not (Test-Path "release/悦听-debug.apk")) {
  Write-Host "正在打包 APK…"
  npm run android:apk
}

$apkSrc = "release/悦听-debug.apk"
$apkAsset = "release/yueting-debug.apk"
Copy-Item $apkSrc $apkAsset -Force

if (-not (Test-Path ".git")) {
  git init -b main | Out-Null
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  $repoName = if ($Repo) { $Repo } else { "yueting" }
  Write-Host "正在创建 GitHub 仓库并推送代码…"
  gh repo create $repoName --public --source=. --remote=origin --push --description "悦听 - 音乐播放器"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  git add -A
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m "chore: sync before release $Version"
  }
  git push -u origin HEAD 2>$null
  if ($LASTEXITCODE -ne 0) { git push -u origin main }
}

$notes = @"
悦听 Android 调试包（Capacitor）

- 安装：下载 \`yueting-debug.apk\` 后允许未知来源安装
- 版本：$Version
- 说明：debug 未签名包，仅供自测
"@

gh release view $Version 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  gh release upload $Version $apkAsset --clobber
} else {
  gh release create $Version $apkAsset --title "悦听 $Version" --notes $notes
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$json = gh release view $Version --json url,assets | ConvertFrom-Json
Write-Host ""
Write-Host "Release 页面：" -ForegroundColor Green
Write-Host $json.url
Write-Host ""
Write-Host "APK 直链（手机浏览器可下载）：" -ForegroundColor Green
foreach ($asset in $json.assets) {
  if ($asset.name -like "*.apk") {
    Write-Host $asset.browser_download_url
  }
}
