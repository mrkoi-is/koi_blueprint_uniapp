import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useAppStore } from "../../src/stores/app.store";

describe("app store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("records the supplied launch time deterministically", () => {
    const store = useAppStore();

    store.markLaunched(123);

    expect(store.launchedAt).toBe(123);
  });
});
