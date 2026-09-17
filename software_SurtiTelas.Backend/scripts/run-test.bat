@echo off
cd /d "C:\Users\usuario\surti_telas\software_SurtiTelas.Backend"
start /b cmd /c "npx tsx src/server.ts > server.log 2>&1"
timeout /t 8 /nobreak > nul
echo Server started, running test...
npx tsx scripts/test-full-flow.ts 2>&1
echo DONE
