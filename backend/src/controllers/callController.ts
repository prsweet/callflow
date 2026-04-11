import { status, type Context } from "elysia";
import { errors, response, speechResult, type customerPhone } from "../types";
import twilio from "twilio";
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const URL = process.env.URL!;
const noExecMessage = "Sorry for the inconvenience, looks like there have "

const triggerOutbound = async({ body }: Context<{ body: customerPhone }>) => {
    try {
        const call = await client.calls.create({
            to: body.customerPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: URL + "/call/inbound",
            method: "POST"
        });
        return status(200, response(true, { callSid: call.sid }, null));
    } catch(e) {
        console.log(twilio, e);
        return status(500, response(false, null, errors.failedInitialisingCall500));
    }
}

const handleIncoming = async ({ set }: Context) => {
    const callResponse = new VoiceResponse();
    const gather = callResponse.gather({
        input: ["speech"],
        action: "/call/classify",
        language: "hi-IN",
        speechTimeout: "auto"
    });
    gather.say({
        language: "hi-IN",
        voice: "Polly.Kajal-Neural"
    }, "Welcome to Hundred X Dealers, मैं कैसे आपकी मदद कर सकती हूँ?");

    set.headers["Content-Type"] = "text/xml";
    return callResponse.toString();
}

export const callController = {
    handleIncoming,
    triggerOutbound
}

/*
    another way: 
    record initial convo -> send to ai to detect language -> set the lang of twilio to that...
    pro: multi-lang
    cons: latency
*/