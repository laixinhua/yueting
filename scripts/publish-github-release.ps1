#Requires -Version 5.1
param(
  [string]$Version = "v0.5.0",
  [string]$Repo = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Get-GitOriginUrl {
  $old = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $url = git remote get-url origin 2>$null
  $ErrorActionPreference = $old
  if ($LASTEXITCODE -ne 0) { return $null }
  return $url
}

function Ensure-GhAuth {
  gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login first: gh auth login" -ForegroundColor Yellow
    Write-Host "Then run: npm run release:github" -ForegroundColor Yellow
    exit 1
  }
}

Ensure-GhAuth

$apkAsset = "release/yueting-debug.apk"
if (-not (Test-Path $apkAsset)) {
  Write-Host "Building APK..."
  npm run android:apk
}

if (-not (Test-Path $apkAsset)) {
  Write-Host "APK not found: $apkAsset" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".git")) {
  git init -b main | Out-Null
}

$remote = Get-GitOriginUrl
if (-not $remote) {
  $repoName = if ($Repo) { $Repo } else { "yueting" }
  Write-Host "Creating GitHub repo and pushing..."
  gh repo create $repoName --public --source=. --remote=origin --push --description "Yueting music player"
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

$notes = "Yueting Android debug APK. Download yueting-debug.apk on your phone. Version: $Version."

gh release view $Version 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  gh release upload $Version $apkAsset --clobber
} else {
  gh release create $Version $apkAsset --title "Yueting $Version" --notes $notes
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$json = gh release view $Version --json url,assets | ConvertFrom-Json
Write-Host ""
Write-Host "Release URL:" -ForegroundColor Green
Write-Host $json.url
Write-Host ""
Write-Host "APK download (open on phone):" -ForegroundColor Green
foreach ($asset in $json.assets) {
  if ($asset.name -like "*.apk") {
    Write-Host $asset.browser_download_url
  }
}
