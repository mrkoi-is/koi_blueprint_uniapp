---
name: add-platform-adapter
description: Add or change a semantic platform adapter in the uni-app blueprint. Use for uni APIs, direct WeChat-only wx APIs, browser capabilities, login, media, permissions, payment, storage, subscriptions, lifecycle, or device behavior.
---

# Add Platform Adapter

## Workflow

1. Read the active spec and write a capability matrix for H5 and `mp-weixin`:
   supported behavior, denial/cancellation, unavailable behavior, lifecycle,
   and required runtime evidence.
2. Define a small semantic port near the consuming Feature or stable core
   contract. Model outcomes as typed errors or discriminated results.
3. Choose the narrowest implementation boundary:
   - normalized `uni.*` capability → `src/platform/uni/`;
   - browser global or DOM behavior → `src/platform/h5/`;
   - unavoidable WeChat-only `wx.*` capability →
     `src/platform/mp-weixin/`.
4. Keep conditional compilation inside `src/platform/` or the application
   shell. Do not scatter target checks through Features or shared UI.
5. Inject the adapter from `src/bootstrap/`.
6. Test the consuming use case with a fake port. Add adapter contract tests
   where platform calls can be deterministically simulated.
7. Record DevTools or real-device acceptance for permissions, payment, media,
   safe areas, background/foreground behavior, and other device-owned effects.
8. Run:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

## Boundaries

- Do not wrap the complete `uni` or `wx` namespace.
- Do not call direct `wx.*` when a semantically equivalent `uni.*` API is
  sufficient.
- Do not silently substitute a mock, H5 approximation, or Stable behavior for
  a requested WeChat-only capability.
- Do not treat a client callback as proof of durable payment, order, upload, or
  server-job success.
- If the capability belongs to the explicitly selected AI Alpha profile, load
  `weixin-ai-profile` as well.
