import Elysia from "elysia";
import { callController } from "../controllers/callController";
import { customerPhone } from "../types";

export const app = new Elysia();

app.group('/call', (app) => {
    app.post('/inbound', callController.handleInbound);
    app.post('/outbound', callController.triggerOutbound, { body: customerPhone });
    app.post('/route-dial', callController.routeDial);
    app.ws('/ws', {
        message(ws, msg) {
            console.log("ws msg type:", typeof msg, msg);
            try {
                callController.wsConversation(ws, msg);
            } catch(e) {
                console.log("WS PARSE ERROR:", e);
            }
        }
    })
    return app;
});