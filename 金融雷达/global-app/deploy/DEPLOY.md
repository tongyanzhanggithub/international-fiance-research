# 部署上线指南（童彦彰的金融工具）

把本地跑的雷达部署到公网服务器，让别人能访问、访客分析后台才有数据。
整个项目是纯 Node（无 npm 依赖），部署很轻。以下以 **Ubuntu 22.04 云服务器**为例（阿里云/腾讯云轻量服务器均可）。

---

## 0. 准备
- 一台云服务器（1核2G 起步够用），记下公网 IP
- 一个域名（可选但强烈建议，HTTPS 需要），把域名 A 记录解析到服务器公网 IP
- 云控制台**安全组放行端口 22 / 80 / 443**

## 1. 装 Node 24（含 node:sqlite）
本项目用到 `node:sqlite`，需要 **Node 24+**。
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs
node -v   # 应显示 v24.x
```
> 若启动时报 `node:sqlite` 相关错误，在 pm2 配置里给 app 加 `node_args: "--experimental-sqlite"`。

## 2. 上传代码
把整个 `global-app` 目录传到服务器 `/opt/finance-radar/global-app`：
```bash
sudo mkdir -p /opt/finance-radar/data
# 方式A：git（若已推到 GitHub）
sudo git clone <你的仓库地址> /opt/finance-radar/global-app
# 方式B：本地 scp 上传
# scp -r ./global-app root@服务器IP:/opt/finance-radar/global-app
```

## 3. 配置（关键）
编辑 `/opt/finance-radar/global-app/deploy/ecosystem.config.js`：
- `ADMIN_TOKEN` → **改成一长串随机口令**（访客分析后台登录用）
- `DEEPSEEK_API_KEY` → 填你的 DeepSeek key（激活 4 个 AI 功能；没有就留空）
- `cwd` / `DATA_DIR` → 确认路径与实际一致
```bash
# 生成一个随机口令参考
openssl rand -hex 16
```

## 4. pm2 常驻 + 开机自启
```bash
sudo npm install -g pm2
cd /opt/finance-radar/global-app
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # 按提示复制执行它给出的命令，实现开机自启
pm2 logs finance-radar   # 看日志，出现 "server running" 即成功
```
此时服务在 `127.0.0.1:8288`（还没对外，下一步用 Nginx 暴露）。

## 5. Nginx 反向代理
```bash
sudo apt-get install -y nginx
sudo cp /opt/finance-radar/global-app/deploy/nginx.conf.example /etc/nginx/conf.d/finance-radar.conf
sudo nano /etc/nginx/conf.d/finance-radar.conf   # 把 your-domain.com 改成你的域名
sudo nginx -t && sudo systemctl reload nginx
```
现在用 `http://你的域名` 应该能打开（先临时把配置里的 ssl 部分注释掉、listen 改 80 测试，或直接进第 6 步上 HTTPS）。

## 6. HTTPS（Let's Encrypt 免费证书）
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# 按提示填邮箱、同意条款，certbot 自动申请证书并改好 Nginx 配置
sudo systemctl reload nginx
```
证书 90 天自动续期（certbot 自带定时任务）。完成后 `https://你的域名` 生效。

## 7. 验收
- `https://你的域名/` → 雷达选择页（全球/中国/产业链）
- `https://你的域名/admin.html` → 访客分析后台，用 `ADMIN_TOKEN` 登录
- 用手机开一下各雷达，回后台看「实时在线 / 观看时长」是否有数据

---

## ⚠️ 上线安全清单
- [ ] `ADMIN_TOKEN` 已改成长随机串（不要用默认的 change-me）
- [ ] `/api/track` 已内置 IP 限流（240 次/分），无需额外配置
- [ ] 如只想自己看后台：Nginx 配置里给 `/admin.html` 加 IP 白名单（模板里有注释示例）
- [ ] `DATA_DIR` 指向代码目录外，`users.db`（含访客数据）不会被 git pull 覆盖
- [ ] 定期备份 `/opt/finance-radar/data/users.db`

## 日常运维
```bash
pm2 restart finance-radar     # 改了 server.js/auth.js 后重启
pm2 logs finance-radar        # 看日志
git -C /opt/finance-radar/global-app pull && pm2 restart finance-radar   # 更新代码
```
> 改前端静态文件（HTML/CSS/前端 JS）无需重启，浏览器刷新即可；只有改 `server.js`/`auth.js` 才要 `pm2 restart`。
