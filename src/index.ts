import { Hono } from "hono";
import { errorHandler } from "./shared/errors/error-handler";

const app = new Hono();

app.onError(errorHandler);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
