import Elysia from "elysia";
import { callController } from "../controllers/callController";
import { customerPhone } from "../types";

export const app = new Elysia();

app.group('/call', (app) => {
    app.post('/inbound', callController.handleIncoming);
    app.post('/outbound', callController.triggerOutbound, { body: customerPhone });
    return app;
});