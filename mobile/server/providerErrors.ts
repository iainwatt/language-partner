import { providers, type Provider } from "../src/core/domain";

export type ProviderFailure = "authentication" | "access" | "model" | "quota" | "rate-limit" | "request" | "unavailable";

// Never forward a provider's raw error message: it may echo an API key or input.
// Only known machine-readable codes and request IDs may reach diagnostic logs.
const knownCodes = new Set([
  "invalid_api_key", "authentication_error", "ip_not_authorized", "UNAUTHENTICATED",
  "permission_denied", "permission_error", "PERMISSION_DENIED",
  "model_not_found", "not_found_error", "NOT_FOUND",
  "insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached",
  "rate_limit_exceeded", "rate_limit_error", "RESOURCE_EXHAUSTED",
  "invalid_request_error", "INVALID_ARGUMENT", "context_length_exceeded",
  "server_error", "api_error", "overloaded_error", "INTERNAL", "UNAVAILABLE",
]);

export class ProviderRequestError extends Error {
  readonly callableCode;

  constructor(
    readonly provider: Provider,
    readonly status: number,
    readonly reason: ProviderFailure,
    readonly providerCode: string | null,
    readonly requestId: string | null,
  ) {
    const name = providers[provider].name;
    const messages: Record<ProviderFailure, string> = {
      authentication: `${name}’s service connection could not be authenticated. Language Partner needs to restore its service connection. Please try again later.`,
      access: `${name} is not allowing this request. Language Partner needs to restore service access. Please try again later.`,
      model: `The selected ${name} model is unavailable. Language Partner needs to update its service configuration. Please try again later.`,
      quota: `${name}’s AI allowance has been used up. Please try again once Language Partner’s service allowance is restored.`,
      "rate-limit": `${name} is receiving too many requests. Wait a moment, then retry.`,
      request: `${name} could not process this request. Try a shorter message and retry.`,
      unavailable: `${name} is temporarily unavailable. Please retry in a moment.`,
    };
    super(messages[reason]);
    this.name = "ProviderRequestError";
    // A provider's 401 is a service configuration issue, not an expired app login.
    this.callableCode = reason === "authentication" || reason === "access" || reason === "model"
      ? "failed-precondition" as const
      : reason === "quota" || reason === "rate-limit"
        ? "resource-exhausted" as const
        : reason === "request" ? "invalid-argument" as const : "unavailable" as const;
  }

  diagnostics() {
    return { provider: this.provider, providerStatus: this.status, reason: this.reason, providerCode: this.providerCode, providerRequestId: this.requestId };
  }
}

export async function providerRequestError(provider: Provider, response: Response): Promise<ProviderRequestError> {
  const payload = await response.json().catch(() => null);
  const providerCode = [payload?.error?.code, payload?.error?.type, payload?.error?.status]
    .find((code) => typeof code === "string" && knownCodes.has(code)) ?? null;
  const header = response.headers.get("x-request-id") ?? response.headers.get("request-id");
  const requestId = header && /^(req_[A-Za-z0-9_-]{1,90}|[a-f0-9-]{32,36})$/.test(header) ? header : null;
  const status = response.status;
  const reason: ProviderFailure = status === 401 ? "authentication"
    : status === 403 ? "access"
    : status === 404 || providerCode === "model_not_found" ? "model"
    : status === 429
      ? ["insufficient_quota", "credit_balance_exhausted", "billing_hard_limit_reached"].includes(providerCode ?? "") ? "quota" : "rate-limit"
      : status === 400 || status === 422 ? "request" : "unavailable";
  return new ProviderRequestError(provider, status, reason, providerCode, requestId);
}
