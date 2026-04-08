import Elysia from "elysia";
import { authController } from "../controllers/authController";
export const app = new Elysia();

app.group('/auth', (app) => {
    app.post('/signup', authController.signupUser);
    app.post('/login', authController.loginUser);
    return app;
})