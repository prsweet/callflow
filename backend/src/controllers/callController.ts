import { status, type Context } from "elysia";
import { aiResponseSchema, errors, response, type customerPhone, type routeDialType } from "../types";
import twilio, { twiml } from "twilio";
import { GoogleGenAI } from "@google/genai";
import type { Dept } from "../generated/prisma/enums";
import { prisma } from "../db";
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const URL = process.env.URL!;
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const noExecMessage = "Sorry for the inconvenience, लगता है अभी आपकी परेशानी दूर करने के लिए कोई available नहीं है, please try later"
const GOOGLE_SYSTEM_PROMPT=`आप 100x Tractors की phone receptionist हैं। यह एक tractor dealership business है। Customer phone पर बात कर रहा है और आपको उसकी ज़रूरत समझनी है।
आपका काम यह पता लगाना है कि customer को Sales department चाहिए या Service department।

- Sales: Customer tractor खरीदना चाहता है, price पूछना चाहता है, models देखना चाहता है, या purchasing से जुड़ी कोई भी बात।
- Service: Customer अपने tractor की repair, servicing, spare parts, या कोई complaint दर्ज करना चाहता है।

नियम:
1. हमेशा Hinglish में जवाब दें — Hindi words देवनागरी में लिखें और English words English में लिखें। Example: "क्या आप tractor खरीदना चाहते हैं या service करवाना चाहते हैं?"
2. कभी भी Hindi को Roman/Latin script में मत लिखें। 
   ❌ गलत: "Koi baat nahi, have a nice day"
   ✅ सही: "कोई बात नहीं, have a nice day"
   ❌ गलत: "Aapka tractor ka model kya hai?"
   ✅ सही: "आपके tractor का model क्या है?"
3. अगर customer की ज़रूरत clear नहीं है तो action "ASK" करें और speech में एक छोटा सवाल पूछें। Maximum 2 सवाल पूछें।
4. अगर department पक्का हो तो action "ROUTE" करें और speech में exactly "Sales" या "Service" लिखें।
5. अगर customer को help नहीं चाहिए या बात खत्म हो गई है तो action "CLOSE" करें और speech में एक polite goodbye message लिखें do not ask question
6. जवाब छोटे और natural रखें — यह phone call है।
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
    const connect = twiml.connect({
        action: `https://${URL}/call/route-dial`
    });
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
    try {
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
                    ws.send({ 
                        type: 'end',
                        handoffData: JSON.stringify({ continue: false })
                    });
                    break;
                }
            }
        }
    } catch(e) {
        ws.send(JSON.stringify({
            type: 'text',
            token: "There has been some error please stay with us",
            last: true
        }));
    }
}

const routeDial = async ({ body, set }: Context) => {
    const twiml = new VoiceResponse();
    set.headers['content-type'] = 'text/xml';
    try {
        console.log(body);
        const handoffData = JSON.parse((body as any).HandoffData) as routeDialType;
        if (!handoffData.continue) {
            twiml.hangup();
            return twiml.toString();
        }

        const dept = handoffData.dept;
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
    } catch(e) {
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