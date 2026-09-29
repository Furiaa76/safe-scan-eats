type AlexaRequest = {
  request?: {
    type?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
};

function alexaJson(text: string, shouldEndSession = true) {
  return Response.json({
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text,
      },
      shouldEndSession,
    },
  });
}

export async function GET() {
  return Response.json({
    ok: true,
    service: "Safe Scan Eats Alexa endpoint",
  });
}

export async function POST(request: Request) {
  let body: AlexaRequest;

  try {
    body = (await request.json()) as AlexaRequest;
  } catch {
    return alexaJson("Richiesta non valida.");
  }

  const type = body.request?.type;

  if (type === "LaunchRequest") {
    return alexaJson(
      "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.",
      false,
    );
  }

  if (type === "IntentRequest") {
    const intent = body.request?.intent?.name;

    if (intent === "CreateShoppingListIntent") {
      const dish = body.request?.intent?.slots?.["dish"]?.value?.trim();

      if (!dish) {
        return alexaJson("Quale piatto vuoi preparare?", false);
      }

      return alexaJson(
        `Perfetto. Ho capito che vuoi preparare ${dish}. Il collegamento con Safe Scan Eats funziona.`,
      );
    }

    if (intent === "AMAZON.HelpIntent") {
      return alexaJson(
        "Puoi dirmi: voglio fare la carbonara, oppure: preparami la lista per il tiramisù.",
        false,
      );
    }

    if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
      return alexaJson("Va bene, a presto.");
    }
  }

  return alexaJson(
    "Non ho capito. Prova a dirmi quale piatto vuoi preparare.",
    false,
  );
}
