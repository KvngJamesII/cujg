module.exports = {
  apps: [{
    name: "redon3-api",
    script: "dist/index.mjs",
    cwd: "/root/redon3-workspace/backend",
    max_memory_restart: "512M",
    env: {
      PORT: "3001",
      DATABASE_URL: "postgresql://redon3:redon3secure2026@localhost:5432/redon3",
      JWT_SECRET: "redon3-jwt-secret-2026",
      JWT_REFRESH_SECRET: "redon3-refresh-secret-2026",
      DOCKER_ENABLED: "true",
    },
  }],
};
