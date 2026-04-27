module.exports = {
  apps: [
    {
      name: "rentivo-be",
      script: "npx",
      args: "tsx src/index.ts",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
    },
  ],
};
