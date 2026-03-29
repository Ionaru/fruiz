import { helloMiddleware } from "../middlewares/hello.ts";
import { loggerMiddleware } from "../middlewares/logger.ts";

export default [helloMiddleware, loggerMiddleware]
