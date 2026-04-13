## http handleIncoming
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

## http classifyCall
const classifyCall = async({ set, body }: Context<{ body: speechResult }>) => {
    const twiml = new VoiceResponse();
    set.headers["Content-Type"] = "text/xml";

    try {
        const speech = body.SpeechResult || "";

        if (!speech) {
            twiml.redirect(`${URL}/call/inbound`);
            return twiml.toString();
        }

        twiml.say({
            language: "hi-IN",
            voice: "Polly.Kajal-Neural"
        }, "Please wait!")

        const genResponse = await genAI.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: speech,
            config: { 
                systemInstruction: process.env.GOOGLE_SYSTEM_PROMPT,
                responseSchema: aiResponseSchema,
                responseMimeType: 'application/json'
            }
        });

        const aiResponse = JSON.parse(genResponse.text as string);
        console.log("airesponse", aiResponse.action, aiResponse.speech);

        if (aiResponse.action == "ASK") {
            const gather = twiml.gather({
                input: ["speech"],
                language: "hi-IN",
                action: "/call/classify",
                speechTimeout: "auto",
                method: 'POST'
            });
            gather.say({
                voice: "Polly.Kajal-Neural",
                language: "hi-IN"
            }, aiResponse.speech);
            return twiml.toString();

        } else if (aiResponse.action == "ROUTE") {
            const dept = aiResponse.speech as Dept;
            const availableExec = await prisma.user.findMany({
                where: { department: dept, status: "Free" }
            });

            if (!availableExec[0]) {
                twiml.say({
                    voice: "Polly.Kajal-Neural",
                    language: "hi-IN"
                }, noExecMessage);
                return twiml.toString();
            }

            // here i will call the call executive webhook
            // const execNumbers = availableExec.map(a => a.phone).join(',');
            const dial = twiml.dial();

            availableExec.forEach((p) => {
                dial.number(p.phone);
            });
            return twiml.toString();

        } else if (aiResponse.action == 'CLOSE') {
            twiml.say({
                voice: "Polly.Kajal-Neural",
                language: "hi-IN"
            }, aiResponse.speech);
            return twiml.toString();
        }
    } catch(e) {
        console.log("error:", e);
        twiml.say({
            voice: "Polly.Kajal-Neural",
            language: "hi-IN",
        }, "sorry there was a technical error!");
        return twiml.toString();
    }
}


## gemini
const genResponse = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: speech,
    config: {
        systemInstruction: GOOGLE_SYSTEM_PROMPT,
        responseSchema: aiResponseSchema,
        responseMimeType: 'application/json'
    }
});


## repetition on ai response
fixed by maintaining call transcript