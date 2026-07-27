import { defineStore } from "pinia";

interface AppState {
  launchedAt: number | null;
}

export const useAppStore = defineStore("app", {
  state: (): AppState => ({
    launchedAt: null,
  }),
  actions: {
    markLaunched(now: number = Date.now()): void {
      this.launchedAt = now;
    },
  },
});
