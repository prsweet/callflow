import Elysia from "elysia";
import { callController } from "../controllers/callController";
import { customerPhone } from "../types";

export const app = new Elysia();

app.group('/call', (app) => {
    app.post('/inbound', callController.handleInbound);
    app.post('/outbound', callController.triggerOutbound, { body: customerPhone });
    app.ws('/ws', {
        message(ws, rawMessage) {
            console.log("ws msg type:", typeof rawMessage, rawMessage);
            try {
                callController.wsConversation(ws, rawMessage);
            } catch(e) {
                console.log("WS PARSE ERROR:", e);
            }
        }
    })
    return app;
});