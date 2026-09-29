import { createFileRoute } from "@tanstack/react-router";

type AlexaRequest = {
  session?: {
    application?: { applicationId?: string };
  };
  context?: {
    System?: {
      application?: { applicationId?: string };
    };
  };
  request?: {
    type?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
};

function alexaResponse(text: string, endSession = true) {
  return Response.json({
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text,
      },
      shouldEndSession: endSession,
    },
  });
}

export const Route = createFileRoute("/api/alexa")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          service: "Safe Scan Eats Alexa endpoint",
        }),
      POST: async ({ request }) => {
        let body: AlexaRequest;
        try {
          body = (await request.json()) as AlexaRequest;
        } catch {
          return alexaResponse("Richiesta non valida.");
        }

        const type = body.request?.type;

        if (type === "LaunchRequest") {
          return alexaResponse(
            "Benvenuto in Safe Scan. Dimmi quale piatto vuoi preparare, per esempio: voglio fare la carbonara.",
            false,
          );
        }

        if (type === "IntentRequest") {
          const intent = body.request?.intent?.name;

          if (intent === "CreateShoppingListIntent") {
            const dish = body.request?.intent?.slots?.["dish"]?.value?.trim();
            if (!dish) {
              return alexaResponse(
                "Quale piatto vuoi preparare?",
                false,
              );
            }

            return alexaResponse(
              `Perfetto. Ho capito che vuoi preparare ${dish}. Il collegamento con Safe Scan Eats funziona. Nel prossimo passaggio collegheremo questa richiesta alla tua lista della spesa nell'app.`,
            );
          }

          if (intent === "AMAZON.HelpIntent") {
            return alexaResponse(
              "Puoi dirmi, per esempio: voglio fare la carbonara, oppure: preparami la lista per il tiramisù.",
              false,
            );
          }

          if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
            return alexaResponse("Va bene, a presto.");
          }
        }

        return alexaResponse(
          "Non ho capito. Prova a dirmi quale piatto vuoi preparare.",
          false,
        );
      },
    },
  },
});
