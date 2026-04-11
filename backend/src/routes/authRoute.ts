import Elysia from "elysia";
import { authController } from "../controllers/authController";
import { loginSchema, signupSchema } from "../types";

export const app = new Elysia();

app.group('/auth', (app) => {
    app.post('/signup', authController.signupUser, { body: signupSchema });
    app.post('/login', authController.loginUser, { body: loginSchema });
    return app;
})