import { makeConversation } from "./domain";
import { roleplayPracticeSchema } from "./roleplayTypes";

export const roleplayScenarios = [
  {
    "id": "cafe",
    "title": "Order at a café",
    "learnerRole": "Customer",
    "partnerRole": "Barista",
    "setting": "You stop at a café before a busy day. Choose a drink and something to eat.",
    "objectives": [
      "Order a drink and a snack.",
      "Ask about a size, ingredient or price.",
      "Confirm your order and ask to pay."
    ],
    "prompt": "Offer familiar drinks and snacks with simple fictional prices. Ask one choice at a time. If the learner asks, explain an ingredient or offer an alternative. Confirm the order and total before payment; finish with a friendly goodbye.",
    "openings": {
      "en-US": "Hi! What would you like to drink?",
      "fr-FR": "Bonjour ! Qu’est-ce que vous souhaitez boire ?",
      "es-ES": "¡Hola! ¿Qué le gustaría tomar?",
      "de-DE": "Guten Tag! Was möchten Sie trinken?",
      "it-IT": "Buongiorno! Che cosa desidera bere?",
      "ru-RU": "Здравствуйте! Что вы хотите выпить?"
    }
  },
  {
    "id": "hotel",
    "title": "Check in and fix a room problem",
    "learnerRole": "Hotel guest",
    "partnerRole": "Receptionist",
    "setting": "You arrive at a hotel with a reservation for two nights. After checking in, ask about a noisy room.",
    "objectives": [
      "Confirm your booking and length of stay.",
      "Ask about breakfast or check-out time.",
      "Explain the noise problem and request a solution."
    ],
    "prompt": "Use a fictional booking under Alex for two nights. Accept a made-up name; never request real identity documents, card details or contact information. Start with check-in, then leave room for the learner to raise a noise complaint. Offer a quieter room if requested. Resolve the issue without adding repeated obstacles.",
    "openings": {
      "en-US": "Good evening! Do you have a reservation?",
      "fr-FR": "Bonsoir ! Vous avez une réservation ?",
      "es-ES": "¡Buenas tardes! ¿Tiene una reserva?",
      "de-DE": "Guten Abend! Haben Sie eine Reservierung?",
      "it-IT": "Buonasera! Ha una prenotazione?",
      "ru-RU": "Добрый вечер! У вас есть бронь?"
    }
  },
  {
    "id": "train",
    "title": "Buy a train ticket",
    "learnerRole": "Traveller",
    "partnerRole": "Ticket clerk",
    "setting": "You need a return ticket to a nearby city tomorrow morning. Agree on a departure that suits you.",
    "objectives": [
      "Ask for a return ticket and a departure time.",
      "Check the price and whether you need to change trains.",
      "Confirm the ticket and ask where to board."
    ],
    "prompt": "Use fictional schedules, fares and platform numbers, clearly framed as part of the roleplay. Ask which destination the learner wants, then offer two simple departure choices. Answer questions about changes and price. Do not look up or claim to sell real tickets. Finish when the learner confirms the itinerary.",
    "openings": {
      "en-US": "Hello! Where would you like to travel?",
      "fr-FR": "Bonjour ! Où souhaitez-vous aller ?",
      "es-ES": "¡Hola! ¿Adónde quiere viajar?",
      "de-DE": "Guten Tag! Wohin möchten Sie fahren?",
      "it-IT": "Buongiorno! Dove desidera andare?",
      "ru-RU": "Здравствуйте! Куда вы хотите поехать?"
    }
  },
  {
    "id": "shop-return",
    "title": "Return something to a shop",
    "learnerRole": "Customer",
    "partnerRole": "Shop assistant",
    "setting": "You bought a shirt yesterday. It is too small, and you have the receipt.",
    "objectives": [
      "Explain what you bought and what is wrong.",
      "Ask for another size or a refund.",
      "Agree on a solution and confirm the next step."
    ],
    "prompt": "Accept a fictional purchase and receipt; do not request real transaction details. Ask what the problem is. Offer an exchange first, but accept a polite refund request in this fictional store. Keep the interaction cooperative. End once a solution is agreed; do not claim to process a real refund.",
    "openings": {
      "en-US": "Hello! How can I help you today?",
      "fr-FR": "Bonjour ! Comment puis-je vous aider ?",
      "es-ES": "¡Hola! ¿En qué puedo ayudarle?",
      "de-DE": "Guten Tag! Wie kann ich Ihnen helfen?",
      "it-IT": "Buongiorno! Come posso aiutarla?",
      "ru-RU": "Здравствуйте! Чем я могу вам помочь?"
    }
  },
  {
    "id": "dinner-plans",
    "title": "Make plans with a new friend",
    "learnerRole": "Friend arranging an evening out",
    "partnerRole": "New friend",
    "setting": "You want to meet for dinner this weekend. Find a time and place that work for both of you.",
    "objectives": [
      "Suggest a day and an activity.",
      "Ask about preferences and offer an alternative.",
      "Agree on a time and meeting place."
    ],
    "prompt": "Be a friendly new acquaintance. Saturday evening works; Friday does not. Mention this only when relevant, and offer an alternative rather than rejecting repeatedly. Have a simple food preference, not a complicated dietary constraint. Finish by confirming the agreed plan. Use fictional places and avoid asking for an address or phone number.",
    "openings": {
      "en-US": "It would be nice to meet this weekend. What would you like to do?",
      "fr-FR": "Ça me ferait plaisir de te voir ce week-end. Qu’est-ce que tu aimerais faire ?",
      "es-ES": "Me gustaría verte este fin de semana. ¿Qué te gustaría hacer?",
      "de-DE": "Es wäre schön, dich am Wochenende zu sehen. Was möchtest du machen?",
      "it-IT": "Mi farebbe piacere vederti questo fine settimana. Che cosa ti piacerebbe fare?",
      "ru-RU": "Было бы здорово встретиться на выходных. Что ты хочешь делать?"
    }
  },
  {
    "id": "interview",
    "title": "Practise a job interview",
    "learnerRole": "Applicant for a fictional part-time job",
    "partnerRole": "Interviewer",
    "setting": "You are interviewing for a part-time role at a small local bookshop. Use real or invented experience.",
    "objectives": [
      "Introduce yourself and a relevant strength.",
      "Describe an experience and your availability.",
      "Ask a question about the role."
    ],
    "prompt": "Interview for a fictional part-time bookshop role. Ask about the learner’s interests, one example of helping someone and availability, one question at a time. Welcome invented experience. Avoid sensitive personal information, protected characteristics, salary negotiation and hiring judgements. Invite a question from the applicant and close with thanks; give language feedback, not employment advice.",
    "openings": {
      "en-US": "Thanks for coming in. Could you tell me a little about yourself?",
      "fr-FR": "Merci d’être venu. Pourriez-vous vous présenter en quelques mots ?",
      "es-ES": "Gracias por venir. ¿Podría contarme un poco sobre usted?",
      "de-DE": "Danke, dass Sie gekommen sind. Können Sie uns etwas über sich erzählen?",
      "it-IT": "Grazie di essere qui. Può parlarci un po’ di sé?",
      "ru-RU": "Спасибо, что пришли. Расскажите немного о себе, пожалуйста."
    }
  }
];
export type RoleplayScenario = typeof roleplayScenarios[number];

export function roleplayForLanguage(scenario: RoleplayScenario, target: string) {
  const openings = scenario.openings as Record<string, string>;
  const { openings: _openings, ...practice } = scenario;
  return roleplayPracticeSchema.parse({
    ...practice,
    openingPrompt: openings[target] ?? openings["en-US"],
    openingLanguage: openings[target] ? target : "en-US",
  });
}

export function makeRoleplayConversation(scenario: RoleplayScenario, native: string, target: string) {
  return {
    ...makeConversation(native, target, false),
    title: scenario.title,
    roleplay: roleplayForLanguage(scenario, target),
  };
}
