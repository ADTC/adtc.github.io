import { type ModelMessage, streamText } from "ai";
import { instructions } from "../lib/instructions.js";

const model = process.env.CHAT_MODEL ?? "google/gemini-2.5-flash-lite";
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://adtc.github.io,http://localhost:4321").split(",");

// Keep in sync with the limits in src/components/Ask.astro.
const MAX_MESSAGES = 11;
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 4000;
const MAX_BODY_LENGTH = 32_000;

const errorResponse = (status: number, code: string, headers: Record<string, string> = {}) =>
  Response.json({ error: code }, { status, headers });

// Messages must alternate, starting and ending with the visitor's question.
const parseMessages = (body: string): ModelMessage[] | undefined => {
  if (body.length > MAX_BODY_LENGTH) return;
  let messages: unknown;
  try {
    messages = (JSON.parse(body) as { messages?: unknown }).messages;
  } catch {
    return;
  }
  if (!Array.isArray(messages) || messages.length % 2 === 0 || messages.length > MAX_MESSAGES) return;

  const valid = messages.every((message, index) => {
    const role = index % 2 === 0 ? "user" : "assistant";
    const limit = role === "user" ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH;
    return (
      message?.role === role &&
      typeof message.content === "string" &&
      message.content.trim() !== "" &&
      message.content.length <= limit
    );
  });
  if (!valid) return;
  return messages.map(({ role, content }) => ({ role, content }));
};

export default {
  async fetch(request: Request) {
    const origin = request.headers.get("origin") ?? "";
    if (!allowedOrigins.includes(origin)) return errorResponse(403, "forbidden");
    const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    if (request.method !== "POST") return errorResponse(405, "method_not_allowed", cors);

    const messages = parseMessages(await request.text());
    if (!messages) return errorResponse(400, "invalid_request", cors);

    const result = streamText({
      model,
      instructions: instructions(new Date().toISOString().slice(0, 10)),
      messages,
      maxOutputTokens: 600,
      temperature: 0.2,
      abortSignal: request.signal,
      // The full error object includes the request body, which would put visitors' questions in the logs.
      onError: ({ error }) => console.error("Chat model error:", error instanceof Error ? error.message : error),
    });

    const parts = result.stream[Symbol.asyncIterator]();
    const nextText = async () => {
      for (;;) {
        const { done, value: part } = await parts.next();
        if (done) return;
        if (part.type === "text-delta") return part.text;
        if (part.type === "error") throw part.error;
      }
    };

    // Failures arrive as stream parts, so read the first chunk before committing to a 200.
    let first: string | undefined;
    try {
      first = await nextText();
    } catch (cause) {
      const rateLimited = (cause as { statusCode?: number }).statusCode === 429;
      return errorResponse(rateLimited ? 429 : 503, rateLimited ? "rate_limited" : "unavailable", cors);
    }
    if (first === undefined) return errorResponse(503, "unavailable", cors);

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(first));
      },
      async pull(controller) {
        try {
          const text = await nextText();
          if (text === undefined) controller.close();
          else controller.enqueue(encoder.encode(text));
        } catch (cause) {
          controller.error(cause);
        }
      },
      async cancel() {
        await parts.return?.();
      },
    });

    return new Response(body, {
      headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  },
};
