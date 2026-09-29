type AlexaRequest = {
  request?: {
    type?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
};

function buildAlexaResponse(text: string, shouldEndSession = true) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text,
      },
      shouldEndSession,
    },
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Safe Scan Eats Alexa endpoint",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body || {}) as AlexaRequest;
  const type = body.request?.type;

  if (type === "LaunchRequest") {
    return res.status(200).json(
      buildAlexaResponse(
        "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.",
        false,
      ),
    );
  }

  if (type === "IntentRequest") {
    const intent = body.request?.intent?.name;

    if (intent === "CreateShoppingListIntent") {
      const dish = (body.request?.intent?.slots?.["piatto"]?.value ?? body.request?.intent?.slots?.["dish"]?.value)?.trim();

      if (!dish) {
        return res.status(200).json(
          buildAlexaResponse("Quale piatto vuoi preparare?", false),
        );
      }

      return res.status(200).json(
        buildAlexaResponse(
          `Perfetto. Ho capito che vuoi preparare ${dish}. Il collegamento con Safe Scan Eats funziona.`,
        ),
      );
    }

    if (intent === "AMAZON.HelpIntent") {
      return res.status(200).json(
        buildAlexaResponse(
          "Puoi dirmi: voglio fare la carbonara, oppure: preparami la lista per il tiramisù.",
          false,
        ),
      );
    }

    if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
      return res.status(200).json(buildAlexaResponse("Va bene, a presto."));
    }
  }

  return res.status(200).json(
    buildAlexaResponse(
      "Non ho capito. Prova a dirmi quale piatto vuoi preparare.",
      false,
    ),
  );
}
