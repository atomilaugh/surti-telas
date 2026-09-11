@echo off
echo Applying database migrations...
cd /d C:\Users\usuario\surti_telas\software_SurtiTelas.Backend
call npm run prisma:deploy
if errorlevel 1 (
    echo [ERROR] No se pudieron aplicar las migraciones de la base de datos.
    pause
    exit /b 1
)

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
