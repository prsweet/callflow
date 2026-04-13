import Groq from "groq-sdk";
import type { ElysiaWS } from "elysia/ws";
import { status, type Context } from "elysia";
import { type aiResponseSchema, errors, response, type customerPhone, type routeDialType } from "../types";
import twilio from "twilio";
import type { Dept } from "../generated/prisma/enums";
import { prisma } from "../db";
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const URL = process.env.URL!;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); // exp
const noExecMessage = "Sorry for the inconvenience, लगता है अभी आपकी परेशानी दूर करने के लिए कोई available नहीं है, please try later";
const SYSTEM_PROMPT = `You are an AI call assistant responsible for understanding customer intent and deciding whether to ask for clarification, route the call, or close it.

You will be given the conversation context as a multi-line string containing previous dialogue between the customer and the assistant.

Your task is to classify the intent and respond in a structured JSON format with two fields:
- "action": one of ["ASK", "ROUTE", "CLOSE"]
- "speech": the exact sentence to speak to the customer

---

### Language Rule:
- Detect the language of the customer's latest message.
- If the customer speaks in Hindi, respond in Hindi.
- If the customer speaks in English, respond in English.
- Maintain the same language consistently in your response.
- Do NOT mix languages.

---

### Intent Categories:
1. Sales → Customer wants to buy, inquire about pricing, plans, offers, or new services.
2. Service → Customer has an issue, complaint, support request, or needs help with an existing product/service.

---

### Decision Rules:

#### 1. ASK (Clarification or Confirmation)
- Use when the intent is unclear OR partially understood.
- ALSO use when you are confident about routing BUT must confirm one final time before routing.
- Always ask a polite, professional confirmation question.

Examples:
- English: "Could you please confirm if you are facing an issue with an existing service?"
- Hindi: "कृपया पुष्टि करें कि क्या आपको किसी मौजूदा सेवा में समस्या आ रही है?"

---

#### 2. ROUTE (Final Decision)
- Use ONLY when the intent is 100% clear AND already confirmed by the customer.
- "speech" MUST be strictly one of:
  - "Sales"
  - "Service"
- Do NOT include any additional text.
- Language rule does NOT apply here (always return exactly "Sales" or "Service").

---

#### 3. CLOSE (Irrelevant / Spam / Out of Scope)
- Use when the customer query is:
  - Spam
  - Abusive
  - Completely unrelated
  - Not actionable
- Respond politely and end the conversation.

Examples:
- English: "Thank you for contacting us. Have a great day."
- Hindi: "हमसे संपर्क करने के लिए धन्यवाद। आपका दिन शुभ हो।"

---

### Important Behavior Rules:
- Be concise, polite, and professional at all times.
- Never assume intent without sufficient evidence.
- Always prefer ASK over ROUTE if there is any uncertainty.
- Even if highly confident, perform one final confirmation (ASK) before routing.
- Only output valid JSON. No extra text.

---

### Output Format (Strict):
{
  "action": "ASK" | "ROUTE" | "CLOSE",
  "speech": "<string>"
}

---

### Example:

Input Context:
Customer: मुझे crack.

Output:
{
  "action": "ASK",
  "speech": "कृपया
`;
const activeConvo: { callSid: string, convo: string[] }[] = [];
export interface callEWS extends ElysiaWS {
    data: {
        callSid?: string
    }
}

const triggerOutbound = async ({ body }: Context<{ body: customerPhone }>) => {
    try {
        const call = await client.calls.create({
            to: body.customerPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: `https://${URL}/call/inbound`,
            method: "POST"
        });
        return status(200, response(true, { callSid: call.sid }, null));
    } catch (e) {
        console.log(twilio, e);
        return status(500, response(false, null, errors.failedInitialisingCall500));
    }
}

const handleInbound = async ({ set }: Context) => {
    const twiml = new VoiceResponse();
    const connect = twiml.connect({
        action: `https://${URL}/call/route-dial`
    });
    connect.conversationRelay({
        url: `wss://${URL}/call/ws`,
        ttsProvider: "ElevenLabs",
        welcomeGreeting: "Welcome to Hundred X Tractors, मैं कैसे आपकी मदद कर सकती हूँ?",
        language: "hi-IN",
        voice: "kiaJRdXJzloFWi6AtFBf",
    });
    set.headers['content-type'] = 'text/xml';
    return twiml.toString();
}

const wsConversation = async (ws: callEWS, msg: any) => {
    if (msg.type === 'setup') {
        console.log(msg);
        activeConvo.push({
            callSid: msg.callSid,
            convo: []
        });
        ws.data.callSid = msg.callSid;
    }
    if (msg.type === 'prompt' && msg.last === true) {
        try {
            console.log("customer said", msg.voicePrompt);
            const curCall = activeConvo.find(a => a.callSid == ws.data.callSid)!;
            curCall.convo.push(`Customer: ${msg.voicePrompt}`);
            console.log(curCall.convo);
            const generate = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: curCall.convo.join('\n') }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "aiResponse",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                action: { type: "string", enum: ["ASK", "ROUTE", "CLOSE"] },
                                speech: { type: "string" },
                            },
                            required: ["action", "speech"],
                            additionalProperties: false
                        }
                    }
                }
            });
            const aiResponse = JSON.parse(generate.choices[0]?.message.content as string) as aiResponseSchema;
            console.log("aiResopnse", aiResponse.action, aiResponse.speech);
            curCall.convo.push(`You: ${aiResponse.speech}`);
            console.log(curCall.convo);
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
                        type: 'text',
                        token: `Please wait, आपको ${aiResponse.speech} department के executive से connect किया जा रहा है।`
                    }));
                    ws.send(JSON.stringify({
                        type: 'end',
                        handoffData: JSON.stringify({ continue: true, dept: aiResponse.speech })
                    }));
                    break;
                }
                case "CLOSE": {
                    ws.send(JSON.stringify({
                        type: 'text',
                        token: aiResponse.speech,
                        last: true
                    }));
                    ws.send(JSON.stringify({
                        type: 'end',
                        handoffData: JSON.stringify({ continue: false }) // exp
                    }));
                    break;
                }
            }
        } catch (e) {
            console.log("ws error:", e);
            ws.send(JSON.stringify({
                type: 'text',
                token: "There has been some error please stay with us",
                last: true
            }));
        }
    }
}

const routeDial = async ({ body, set }: Context) => {
    const twiml = new VoiceResponse();
    set.headers['content-type'] = 'text/xml';
    try {
        console.log(body);
        const HandoffData = JSON.parse((body as any).HandoffData) as routeDialType;
        if (!HandoffData.continue) {
            twiml.hangup();
            return twiml.toString();
        }

        const dept = HandoffData.dept as Dept;
        const availableExec = await prisma.user.findMany({
            where: { department: dept }
        });

        if (!availableExec[0]) {
            twiml.say({
                voice: "Polly.Kajal-Neural",
                language: "hi-IN"
            }, noExecMessage);
            return twiml.toString();
        }

        const dial = twiml.dial();
        availableExec.forEach((a) => dial.number(a.phone));
        return twiml.toString();
    } catch (e) {
        console.log("error route-dial", e);
        twiml.say({
            voice: "Polly.Kajal-Neural",
            language: "hi-IN"
        }, "there has been an error please stay")
        return twiml.toString();
    }
}

export const callController = {
    handleInbound,
    triggerOutbound,
    wsConversation,
    routeDial
}

/*
    another way: 
    record initial convo -> send to ai to detect language -> set the lang of twilio to that...
    pro: multi-lang
    cons: latency
*/