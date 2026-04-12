import { status, type Context } from "elysia";
import { aiResponseSchema, errors, response, type customerPhone } from "../types";
import twilio from "twilio";
import { GoogleGenAI } from "@google/genai";
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const URL = process.env.URL!;
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const GOOGLE_SYSTEM_PROMPT = `
You are a Hinglish-speaking female phone receptionist for '100x Dealers', a tractor dealership business.
A customer is calling and you must figure out what they need.
Your job is to determine whether the customer needs the Sales department or the Service department. 
- Sales: The customer wants to buy a tractor, inquire about prices, models, availability, financing, or anything related to purchasing. 
- Service: The customer wants to repair, maintain, or service an existing tractor, get spare parts, report a breakdown, or schedule a service visit. 
Rules: 
1. If the customer's intent is unclear from what they said, use action 'ASK' and ask ONE short clarifying question in the 'speech' field. Do not ask more than 2 clarifying questions total — if still unclear after 2 questions, make your best guess and route. 
2. If you are confident about the department, use action 'ROUTE' and set 'speech' to exactly one of: 'Sales' or 'Service'. No other values are allowed. 
3. If the customer says they don't need help, want to cancel, or the conversation is clearly over, use action 'CLOSE' and set 'speech' to a polite goodbye message. 
4. Keep your questions brief and natural — you are speaking on a phone call, not writing an essay. 
5. write font of the language you are speaking like use devnagari hindi font for saying hindi and normal english font when saying in english
`;

const triggerOutbound = async({ body }: Context<{ body: customerPhone }>) => {
    try {
        const call = await client.calls.create({
            to: body.customerPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: `https://${URL}/call/inbound`,
            method: "POST"
        });
        return status(200, response(true, { callSid: call.sid }, null));
    } catch(e) {
        console.log(twilio, e);
        return status(500, response(false, null, errors.failedInitialisingCall500));
    }
}

const handleInbound = async ({ set }: Context) => {
    const twiml = new VoiceResponse();
    const connect = twiml.connect();
    connect.conversationRelay({
        url: `wss://${URL}/call/ws`,
        ttsProvider: "Amazon",
        welcomeGreeting: "Welcome to Hundred X Tractors, मैं कैसे आपकी मदद कर सकती हूँ?",
        language: "hi-IN",
        voice: "Kajal-Neural"
    });
    set.headers['content-type'] = 'text/xml';
    return twiml.toString();
}

const wsConversation = async (ws: any, msg: any) => {
    if (msg.type == 'setup') {
        console.log("Call Connected:", msg.callSid, "From:", msg.from);
        return;
    }

    if (msg.type === 'prompt' && msg.last === true) {
        const speech = msg.voicePrompt;
        console.log("customer said", speech);
        const genResponse = await genAI.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: speech,
            config: {
                systemInstruction: GOOGLE_SYSTEM_PROMPT,
                responseSchema: aiResponseSchema,
                responseMimeType: 'application/json'
            }
        });
        const aiResponse = JSON.parse(genResponse.text as string);
        console.log("aiResopnse", aiResponse.action, aiResponse.speech);

        switch (aiResponse.action) {
            case "ASK": {
                 ws.send(JSON.stringify({
                    type: 'text',
                    token: aiResponse.speech,
                    last: true
                }));
                break;
            }
            case "ROUTE": {
                ws.send(JSON.stringify({
                    type: 'end',
                    handoffData: JSON.stringify({ dept: aiResponse.speech })
                }));
                break;
            }
            case "CLOSE": {
                ws.send({
                    type: 'text',
                    token: aiResponse.speech,
                    last: true
                });
                ws.send({
                    type: 'end',
                });
                break;
            }
        }
    }
}


export const callController = {
    handleInbound,
    triggerOutbound,
    wsConversation
}

/*
    another way: 
    record initial convo -> send to ai to detect language -> set the lang of twilio to that...
    pro: multi-lang
    cons: latency
*/