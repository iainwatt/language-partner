import {
  providers,
  type Message,
  type Provider,
  type Settings,
} from "../src/core/domain";
import { tokenUsage, type TokenUsage } from "./pricing";
import { providerRequestError } from "./providerErrors";
export type UsageObservation = {
  tokens: TokenUsage | null;
  responseId: string | null;
  responseModel: string | null;
};
export type ObserveUsage = (usage: UsageObservation) => void;
export type ProviderKeys = Partial<Record<Provider, string>>;
export const configured = (keys: ProviderKeys) => ({
  openai: !!keys.openai,
  claude: !!keys.claude,
  gemini: !!keys.gemini,
});
export function providerRequest(
  provider: Provider,
  model: string,
  messages: Pick<Message, "role" | "text">[],
  instruction: string,
  apiKey: string,
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
      body: { model, system: instruction, messages: turns, max_tokens: 8192 },
    };
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { "x-goog-api-key": apiKey },
    body: {
      systemInstruction: { parts: [{ text: instruction }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      generationConfig: { maxOutputTokens: 8192 },
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
export async function generate(
  settings: Settings,
  messages: Pick<Message, "role" | "text">[],
  instruction: string,
  keys: ProviderKeys,
  transport: typeof fetch = fetch,
  observeUsage?: ObserveUsage,
) {
  if (settings.mode !== "api")
    throw new Error("Select API backend explicitly to make provider requests.");
  if (!configured(keys)[settings.provider])
    throw new Error(
      "Selected provider API is not configured. Consumer subscriptions are not connected.",
    );
  const spec = providerRequest(
    settings.provider,
    settings.model,
    messages,
    instruction,
    keys[settings.provider]!,
  );
  const response = await transport(spec.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...spec.headers },
    body: JSON.stringify(spec.body),
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw await providerRequestError(settings.provider, response);
  const payload = await response.json();
  // Capture metering before checking text: incomplete/empty replies can be billed.
  observeUsage?.({
    tokens: tokenUsage(settings.provider, payload),
    responseId: payload.id ?? payload.responseId ?? null,
    responseModel: payload.model ?? payload.modelVersion ?? null,
  });
  if (
    payload.status === "incomplete" ||
    payload.stop_reason === "max_tokens" ||
    payload.candidates?.[0]?.finishReason === "MAX_TOKENS"
  )
    throw new Error(
      "Provider reply exceeded the output limit. Ask for a shorter reply and retry.",
    );
  const text = responseText(settings.provider, payload);
  if (!text.trim())
    throw new Error(
      "The AI service returned no text. Please retry.",
    );
  return text;
}
