@echo off
chcp 65001 >nul
title Factory 1.0 - Runner

echo Установка зависимостей...
call pnpm install

echo Запуск Backend (API) и Frontend (Web)...

:: Запускаем сервисы в отдельных окнах, чтобы можно было видеть логи каждого сервиса
start "Factory API" cmd /k "pnpm dev:api"
start "Factory Web" cmd /k "pnpm dev:web"

echo Сервисы запущены в отдельных окнах!
echo Закройте те окна для остановки сервисов.
pause
