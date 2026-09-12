// pm2 process list for the VPS (see deploy/vps/deploy.sh).
// Ports 3000/3001 belong to other sites on this server; ours bind to
// 127.0.0.1 only and nginx (deploy/vps/nginx-bereal.conf) fronts them.
const root = "/var/www/bereal";

module.exports = {
  apps: [
    {
      name: "bereal-api",
      cwd: `${root}/backend`,
      script: "server.js",
      // NODE_ENV comes from backend/.env (staging until the Resend + Stripe keys exist).
      env: { HOST: "127.0.0.1", PORT: "4000" },
      max_memory_restart: "500M",
      time: true,
    },
    {
      name: "bereal-web",
      cwd: `${root}/frontend`,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
    {
      name: "bereal-backoffice",
      cwd: `${root}/backoffice`,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
