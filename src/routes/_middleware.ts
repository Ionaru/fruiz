import { loggerMiddleware } from "../middlewares/logger.ts";
import { sessionMiddleware } from "../middlewares/session.ts";

export default [sessionMiddleware, loggerMiddleware];
