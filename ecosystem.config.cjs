module.exports = {
  apps: [
    {
      name: "formflow-pro",
      script: "dist/server.cjs",
      instances: "max", // Run in cluster mode using all available CPU cores
      exec_mode: "cluster",
      watch: false, // Prevent reload/flickering loops in production
      max_memory_restart: "1G", // Auto-restart if a memory leak exceeds 1GB
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true
    }
  ]
};
