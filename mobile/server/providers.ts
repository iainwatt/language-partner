import {
  providers,
  type Message,
  type Provider,
  type Settings,
} from "../src/core/domain";
import type { ModelTarget, ReasoningEffort } from "../src/core/managedAi";
import { tokenUsage, type TokenUsage } from "./pricing";
import { ProviderRequestError, providerRequestError } from "./providerErrors";

export type UsageObservation = {
  tokens: TokenUsage | null;
  responseId: string | null;
  responseModel: string | null;
  provider?: Provider;
  model?: string;
  step?: string;
};
export type ObserveUsage = (usage: UsageObservation) => void;
export type ProviderKeys = Partial<Record<Provider, string>>;
export type JsonSchemaFormat = {
  name: string;
  schema: Record<string, unknown>;
};
export type GenerateOptions = {
  effort?: ReasoningEffort;
  format?: JsonSchemaFormat;
  fallbacks?: readonly ModelTarget[];
  allowFallback?: boolean;
  usageStep?: string;
  timeoutMs?: number;
  deadlineMs?: number;
};

export const configured = (keys: ProviderKeys) => ({
  openai: !!keys.openai,
  claude: !!keys.claude,
  gemini: !!keys.gemini,
});

// Convert an OpenAI strict JSON Schema (using ["string", "null"] and
// additionalProperties: false) into Gemini's OpenAPI-subset responseSchema.
function toGeminiSchema(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object") return {};
  const record = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (Array.isArray(record.type)) {
    const nonNull = record.type.filter((item) => item !== "null");
    if (nonNull.length) out.type = String(nonNull[0]).toUpperCase();
    if (record.type.includes("null")) out.nullable = true;
  } else if (typeof record.type === "string") {
    out.type = record.type.toUpperCase();
  }
  if (Array.isArray(record.enum)) out.enum = record.enum;
  if (typeof record.description === "string") out.description = record.description;
  if (record.items && typeof record.items === "object") out.items = toGeminiSchema(record.items);
  if (record.properties && typeof record.properties === "object") {
    out.properties = Object.fromEntries(
      Object.entries(record.properties as Record<string, unknown>).map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  if (Array.isArray(record.required)) out.required = record.required;
  return out;
}

export function providerRequest(
  provider: Provider,
  model: string,
  messages: Pick<Message, "role" | "text">[],
  instruction: string,
  apiKey: string,
  options?: { effort?: ReasoningEffort; format?: JsonSchemaFormat },
): { url: string; headers: Record<string, string>; body: unknown } {
  if (!providers[provider].models.includes(model))
    throw new Error("Model is not in the verified provider catalog.");
  const turns = messages.map((m) => ({ role: m.role, content: m.text }));
  if (provider === "openai")
    return {
      url: "https://api.openai.com/v1/responses",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        instructions: instruction,
        input: turns,
        ...(options?.effort ? { reasoning: { effort: options.effort } } : {}),
        ...(options?.format
          ? {
              text: {
                format: {
                  type: "json_schema",
                  name: options.format.name,
                  strict: true,
                  schema: options.format.schema,
                },
              },
            }
          : {}),
        max_output_tokens: 8192,
        store: false,
      },
    };
  if (provider === "claude")
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model,
        system: instruction,
        messages: turns,
        max_tokens: 8192,
        ...(options?.format
          ? { output_config: { format: { type: "json_schema", schema: options.format.schema } } }
          : {}),
      },
    };
  const thinkingBudget =
    options?.effort === "none" ? 0 : options?.effort === "low" ? 1024 : options?.effort === "medium" ? 4096 : undefined;
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { "x-goog-api-key": apiKey },
    body: {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      generationConfig: {
        maxOutputTokens: 8192,
        ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
        ...(options?.format
          ? {
              responseMimeType: "application/json",
              responseSchema: toGeminiSchema(options.format.schema),
            }
          : {}),
      },
    },
  };
}

export function responseText(provider: Provider, payload: any): string {
  if (provider === "openai")
    return (
      payload.output
        ?.flatMap((item: any) => item.content ?? [])
        .filter((item: any) => item.type === "output_text")
        .map((item: any) => item.text)
        .join("\n") ?? ""
    );
  if (provider === "claude")
    return (
      payload.content
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n") ?? ""
    );
  return (
    payload.candidates?.[0]?.content?.parts
      ?.filter((part: any) => !part.thought)
      .map((part: any) => part.text ?? "")
      .join("\n") ?? ""
  );
}

const recoverableFailure = (error: unknown) =>
  (error instanceof ProviderRequestError &&
    (error.reason === "rate-limit" || error.reason === "quota" || error.reason === "unavailable")) ||
  (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"));

async function attemptGenerate(
  provider: Provider,
  model: string,
  messages: Pick<Message, "role" | "text">[],
  instruction: string,
  apiKey: string,
  transport: typeof fetch,
  observeUsage?: ObserveUsage,
  options?: GenerateOptions,
) {
  const spec = providerRequest(provider, model, messages, instruction, apiKey, {
    effort: options?.effort,
    format: options?.format,
  });
  const defaultTimeout = model === "gpt-5.4" ? 160000 : 55000;
  const requestedTimeout = options?.timeoutMs ?? defaultTimeout;
  const remaining = options?.deadlineMs !== undefined ? options.deadlineMs - Date.now() : requestedTimeout;
  if (remaining <= 0) throw new DOMException("The AI request deadline was exceeded.", "TimeoutError");
  const timeout = Math.min(requestedTimeout, remaining);
  const response = await transport(spec.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...spec.headers },
    body: JSON.stringify(spec.body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw await providerRequestError(provider, response);
  const payload = await response.json();
  // Capture metering before checking text: incomplete/empty replies can be billed.
  observeUsage?.({
    tokens: tokenUsage(provider, payload),
    responseId: payload.id ?? payload.responseId ?? null,
    responseModel: payload.model ?? payload.modelVersion ?? null,
    provider,
    model,
    ...(options?.usageStep ? { step: options.usageStep } : {}),
  });
  if (
    payload.status === "incomplete" ||
    payload.stop_reason === "max_tokens" ||
    payload.candidates?.[0]?.finishReason === "MAX_TOKENS"
  )
    throw new Error(
      "Provider reply exceeded the output limit. Ask for a shorter reply and retry.",
    );
  const text = responseText(provider, payload);
  if (!text.trim())
    throw new Error(
      "The AI service returned no text. Please retry.",
    );
  return text;
}

export async function generate(
  settings: Settings,
  messages: Pick<Message, "role" | "text">[],
  instruction: string,
  keys: ProviderKeys,
  transport: typeof fetch = fetch,
  observeUsage?: ObserveUsage,
  options?: GenerateOptions,
) {
  if (settings.mode !== "api")
    throw new Error("Select API backend explicitly to make provider requests.");
  if (!configured(keys)[settings.provider])
    throw new Error(
      "Selected provider API is not configured. Consumer subscriptions are not connected.",
    );
  try {
    return await attemptGenerate(
      settings.provider,
      settings.model,
      messages,
      instruction,
      keys[settings.provider]!,
      transport,
      observeUsage,
      options,
    );
  } catch (primaryError) {
    if (!options?.allowFallback || !options.fallbacks?.length || !recoverableFailure(primaryError))
      throw primaryError;
    for (const candidate of options.fallbacks) {
      if (candidate.provider === settings.provider && candidate.model === settings.model) continue;
      const key = keys[candidate.provider];
      if (!key || !providers[candidate.provider].models.includes(candidate.model)) continue;
      try {
        return await attemptGenerate(
          candidate.provider,
          candidate.model,
          messages,
          instruction,
          key,
          transport,
          observeUsage,
          { ...options, effort: candidate.effort ?? options.effort },
        );
      } catch (fallbackError) {
        if (!recoverableFailure(fallbackError)) throw fallbackError;
      }
    }
    throw primaryError;
  }
}
