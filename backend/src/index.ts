import Elysia, { status } from "elysia";
import { app as authRoutes } from "./routes/authRoute"
import { app as callRoutes } from "./routes/callRoutes"
import { errors, response } from "./types";
import { callController } from "./controllers/callController";

new Elysia()
    .onError(({ code }) => {
        if (code === 'VALIDATION') return status(400, response(false, null, errors.typeBox400));
    })
    .use(authRoutes)
    .use(callRoutes)
    .listen(3000, () => console.log("Server started on port", 3000))