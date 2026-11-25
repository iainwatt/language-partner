import type { JsonSchemaFormat } from "./providers";

export const chatSchemaFormat: JsonSchemaFormat = {
  name: "chat_reply",
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      natural: { type: ["string", "null"] },
      corrections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            said: { type: "string" },
            better: { type: "string" },
            reason: { type: ["string", "null"] },
          },
          required: ["said", "better", "reason"],
          additionalProperties: false,
        },
      },
      misheard: {
        type: "array",
        items: {
          type: "object",
          properties: {
            recognised: { type: "string" },
            meant: { type: "string" },
          },
          required: ["recognised", "meant"],
          additionalProperties: false,
        },
      },
      meant: { type: ["string", "null"] },
      speaker: { type: ["string", "null"], enum: ["male", "female", null] },
    },
    required: ["reply", "natural", "corrections", "misheard", "meant", "speaker"],
    additionalProperties: false,
  },
};

export const questionsSchemaFormat: JsonSchemaFormat = {
  name: "video_questions",
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phrase: { type: "string" },
            question: { type: "string" },
          },
          required: ["phrase", "question"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export const hintsSchemaFormat: JsonSchemaFormat = {
  name: "answer_hints",
  schema: {
    type: "object",
    properties: {
      hints: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["hints"],
    additionalProperties: false,
  },
};

export const meaningsSchemaFormat: JsonSchemaFormat = {
  name: "script_meanings",
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phrase: { type: "string" },
            meaning: { type: "string" },
          },
          required: ["phrase", "meaning"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export const restsSchemaFormat: JsonSchemaFormat = {
  name: "script_rests",
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            meaning: { type: "string" },
          },
          required: ["index", "meaning"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

export const reviewSchemaFormat: JsonSchemaFormat = {
  name: "phrase_review",
  schema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      better: { type: ["string", "null"] },
      reason: { type: ["string", "null"] },
    },
    required: ["ok", "better", "reason"],
    additionalProperties: false,
  },
};

export const naturalTranslateSchemaFormat: JsonSchemaFormat = {
  name: "natural_translation",
  schema: {
    type: "object",
    properties: {
      natural: { type: "string" },
      literal: { type: ["string", "null"] },
    },
    required: ["natural", "literal"],
    additionalProperties: false,
  },
};
