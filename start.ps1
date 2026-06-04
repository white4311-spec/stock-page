# MarketBoard 시작 스크립트
# 사용: 탐색기에서 더블클릭 or PowerShell에서 .\start.ps1

$root = $PSScriptRoot

Write-Host "=== MarketBoard 시작 ===" -ForegroundColor Cyan

# 기존 프로세스 정리
Write-Host "기존 서버 정리 중..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 백엔드 시작 (새 창)
Write-Host "백엔드 시작 (포트 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python -X utf8 -m uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info" -WindowStyle Normal

Start-Sleep -Seconds 3

# 프론트엔드 시작 (새 창)
Write-Host "프론트엔드 시작 (포트 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 4

# 브라우저 열기
Write-Host "브라우저 열기..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Cyan
Write-Host "백엔드: http://localhost:8001/docs" -ForegroundColor White
Write-Host "프론트: http://localhost:5173" -ForegroundColor White
