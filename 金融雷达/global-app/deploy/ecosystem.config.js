// pm2 进程配置：pm2 start ecosystem.config.js
// pm2 让服务崩溃自动重启、开机自启、后台常驻。
module.exports = {
  apps: [
    {
      name: "finance-radar",
      script: "server.js",
      // 代码所在目录（把项目上传到服务器后改成实际路径）
      cwd: "/opt/finance-radar/global-app",
      instances: 1,
      autorestart: true,
      max_restarts: 15,
      watch: false,
      max_memory_restart: "400M",
      env: {
        // 服务端口（Nginx 会反代到这里，不直接对外）
        PORT: "8288",
        // ⚠️ 上线必改：访客分析后台口令，换成长随机串
        ADMIN_TOKEN: "REPLACE-WITH-A-LONG-RANDOM-TOKEN",
        // DeepSeek key（激活 AI 简报/问答/分析/博研观点）；没有就留空
        DEEPSEEK_API_KEY: "",
        // 数据库(users.db)持久化目录——放在代码目录外，git pull 不会覆盖
        DATA_DIR: "/opt/finance-radar/data",
      },
    },
  ],
};
