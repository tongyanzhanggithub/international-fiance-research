@echo off
chcp 65001 >nul
title 全球金融雷达 · Global Finance Radar
cd /d "%~dp0global-app"
echo 正在启动全球金融雷达（原版 GeoTrade Radar）...
echo 服务地址：http://127.0.0.1:4173
echo 关闭本窗口即可停止服务。

REM ==== AI 简报（DeepSeek 实时生成）====
REM 去掉下面一行开头的 REM，并把 sk-xxx 换成你在 platform.deepseek.com 申请的 API Key：
REM set DEEPSEEK_API_KEY=sk-在这里填入你的DeepSeek密钥

start "" http://127.0.0.1:4173
node server.js
pause
