import { loggerMiddleware } from "../middlewares/logger.ts";

// sessionMiddleware is registered globally in main.ts so it also covers the
// passkey plugin's endpoints.
export default [loggerMiddleware];
