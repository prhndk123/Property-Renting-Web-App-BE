import { App } from "./app.js";

const appInstance = new App();
const app = appInstance.app;

// Hanya jalankan app.start() jika tidak sedang di deploy di Vercel/Production
if (process.env.NODE_ENV !== "production") {
  appInstance.start();
}

export default app;
