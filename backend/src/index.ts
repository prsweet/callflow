import Elysia from "elysia";
const app = new Elysia();
import { app as authRoutes } from "./routes/authRoute"

app.group('/', (app) => {
    app.use(authRoutes);
    return app;
})

app.listen(3000, () => console.log("server stated on port ", 3000));