@echo off
REM Starts the Veritas backend on http://localhost:8000
cd /d "%~dp0backend"
if not exist ".env" (
  echo.
  echo  backend\.env is missing. Copy backend\.env.example to backend\.env and add your keys.
  echo.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating the Python environment ^(first run only^)...
  python -m venv .venv
  .venv\Scripts\python -m pip install -r requirements.txt
)
.venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload
pause
