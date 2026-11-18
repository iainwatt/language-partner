import { prepareSpeechText } from "./speechText";

export type AudioState =
  "idle" | "connecting" | "listening" | "speaking" | "paused" | "error";
export type AudioOwner = "chat" | "translator" | "feedback";
export interface AudioDriver {
  capture(
    language: string,
    onDraft: (text: string) => void,
    onEnd: () => void,
    onError: (message: string) => void,
  ): Promise<void>;
  stopCapture(): Promise<void>;
  speak(
    text: string,
    language: string,
    onEnd: () => void,
    onError: (message: string) => void,
  ): Promise<void>;
  stopSpeaking(): Promise<void>;
}
// One owner, one microphone, one output. Epochs fence late callbacks after interruptions.
export class AudioCoordinator {
  state: AudioState = "idle";
  owner: AudioOwner = "chat";
  error = "";
  private epoch = 0;
  private queue: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private resumeChat?: {
    language: string;
    draft: (text: string) => void;
    onStart?: () => void;
  };
  private currentCapture?: {
    language: string;
    draft: (text: string) => void;
    onStart?: () => void;
  };
  constructor(private driver: AudioDriver) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: AudioState) {
    this.state = state;
    this.listeners.forEach((l) => l());
  }
  private run(action: (epoch: number) => Promise<void>) {
    const epoch = ++this.epoch;
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        try {
          await this.driver.stopCapture();
        } finally {
          await this.driver.stopSpeaking();
        }
        if (epoch === this.epoch) await action(epoch);
      })
      .catch((error) => {
        if (epoch === this.epoch) {
          this.error = String(error.message ?? error);
          this.set("error");
        }
      });
    return this.queue;
  }
  listen(
    owner: AudioOwner,
    language: string,
    draft: (text: string) => void,
    onStart?: () => void,
  ) {
    if (owner === "translator" && this.owner === "chat" && this.currentCapture)
      this.resumeChat = this.currentCapture;
    this.owner = owner;
    this.currentCapture = { language, draft, onStart };
    this.error = "";
    this.set("connecting");
    return this.run(async (epoch) => {
      onStart?.();
      await this.driver.capture(
        language,
        (text) => {
          if (epoch === this.epoch) draft(text);
        },
        () => {
          if (epoch === this.epoch) {
            this.currentCapture = undefined;
            this.set("paused");
          }
        },
        (error) => {
          if (epoch === this.epoch) {
            this.error = error;
            this.currentCapture = undefined;
            this.set("error");
          }
        },
      );
      if (epoch === this.epoch && this.state === "connecting")
        this.set("listening");
    });
  }
  pause() {
    this.error = "";
    this.currentCapture = undefined;
    this.set("paused");
    return this.run(async () => {});
  }
  play(owner: AudioOwner, text: string, language: string) {
    this.error = "";
    if (owner === "translator" && this.owner === "chat" && this.currentCapture)
      this.resumeChat = this.currentCapture;
    this.currentCapture = undefined;
    this.owner = owner;
    return this.run(async (epoch) => {
      const spoken = prepareSpeechText(text);
      if (!spoken) {
        this.set("paused");
        return;
      }
      this.set("speaking");
      await this.driver.speak(
        spoken,
        language,
        () => {
          if (epoch === this.epoch) this.set("paused");
        },
        (message) => {
          if (epoch === this.epoch) {
            this.error = message;
            this.set("error");
          }
        },
      );
    });
  }
  closeTranslator() {
    if (this.owner !== "translator") return Promise.resolve(); // typed lookups leave audio alone
    const resume = this.resumeChat;
    this.resumeChat = undefined;
    this.currentCapture = undefined;
    this.owner = "chat";
    if (resume)
      return this.listen("chat", resume.language, resume.draft, resume.onStart);
    this.set("paused");
    return this.run(async () => {});
  }
  stop() {
    this.error = "";
    this.resumeChat = undefined;
    this.currentCapture = undefined;
    this.owner = "chat";
    this.set("idle");
    return this.run(async () => {});
  }
}
