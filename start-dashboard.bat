@echo off
REM Starts the Veritas dashboard on http://localhost:5173
cd /d "%~dp0dashboard"
if not exist "node_modules" (
  echo Installing dashboard packages ^(first run only^)...
  call npm install
)
call npm run dev
pause
