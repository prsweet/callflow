import Elysia from "elysia";
import { callController } from "../controllers/callController";
import { customerPhone } from "../types";
import { type callEWS } from "../controllers/callController";

export const app = new Elysia();

app.group('/call', (app) => {
    app.post('/inbound', callController.handleInbound);
    app.post('/outbound', callController.triggerOutbound, { body: customerPhone });
    app.post('/route-dial', callController.routeDial);
    app.ws('/ws', {
        message(ws, msg) { 
            callController.wsConversation(ws as callEWS, msg)
        }
    });
    return app;
});