@echo off
REM Opens the backend and the dashboard in two windows.
start "Veritas backend" cmd /k ""%~dp0start-backend.bat""
start "Veritas dashboard" cmd /k ""%~dp0start-dashboard.bat""
echo.
echo  Backend:   http://localhost:8000/health
echo  Dashboard: http://localhost:5173
echo  Extension: chrome://extensions -^> Load unpacked -^> %~dp0extension
echo.
