@echo off
echo Starting Backend...
start "Backend" cmd /c "cd /d C:\Users\usuario\surti_telas\software_SurtiTelas.Backend && npm run dev"
timeout /t 5 /nobreak >nul
echo Starting Frontend...
start "Frontend" cmd /c "cd /d C:\Users\usuario\surti_telas\software_SurtiTelas.Fronend && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul
