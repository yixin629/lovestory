@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0\.."

echo.
echo Verifying project prerequisites and production build...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  goto :failure
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed.
  goto :failure
)

if not exist .env.local (
  echo ERROR: .env.local is missing.
  echo Run: copy .env.local.example .env.local
  goto :failure
)

echo Node:
node --version
echo npm:
npm --version
echo.

call npm ci
if errorlevel 1 goto :failure

call npm run check
if errorlevel 1 goto :failure

echo.
echo Project verification passed.
popd
endlocal
exit /b 0

:failure
echo.
echo Project verification failed.
popd
endlocal
exit /b 1
