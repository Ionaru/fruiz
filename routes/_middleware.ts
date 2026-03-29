import { helloMiddleware } from "../middlewares/hello.ts";
import { loggerMiddleware } from "../middlewares/logger.ts";
import { sessionMiddleware } from "../middlewares/session.ts";

export default [sessionMiddleware, helloMiddleware, loggerMiddleware];
