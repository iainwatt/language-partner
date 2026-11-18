import { Repository } from "./repository";
export const repository = new Repository({
  async get(key) {
    return localStorage.getItem(`lp:${key}`);
  },
  async set(key, value) {
    localStorage.setItem(`lp:${key}`, value);
  },
});
