@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"
if not exist node_modules (
  echo [1/2] 의존성 설치 중... (처음한번만)
  call npm install
)
echo [2/2] 개발서버 시작 - 브라우저에서 http://localhost:5173 열기
timeout /t 2 >nul
start "" http://localhost:5173
call npm run dev
