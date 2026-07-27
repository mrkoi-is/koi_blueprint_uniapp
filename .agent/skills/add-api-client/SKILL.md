---
name: add-api-client
description: Add or change a typed backend integration in the uni-app blueprint. Use for endpoints, DTO mapping, runtime payload validation, OpenAPI output, request errors, retries, cancellation, idempotency, or authentication headers.
---

# Add API Client

## Workflow

1. Read the active spec. Define the endpoint, method, input, output, error,
   timeout, authentication, retry, and idempotency contracts before editing.
2. Reuse the `HttpClient` contract under `src/core/http/`. Keep the concrete
   `uni.request` implementation under `src/platform/uni/`; repositories and
   pages must not call `uni.request` directly.
3. Put endpoint paths, DTO types, runtime guards/mappers, and repository logic
   in the owning Feature.
4. Accept remote data as `unknown`. Validate it and return domain values, never
   the raw platform response or unchecked DTO.
5. Convert transport failures into typed shared errors and domain-specific
   recovery outcomes at the Feature boundary.
6. Retry reads only when the spec permits it. Never auto-retry a mutation
   without a server-supported idempotency contract.
7. Inject the repository or transport from `src/bootstrap/`; use a fake
   `HttpClient` in Feature tests.
8. Test success, malformed payload, timeout/network failure, non-2xx status,
   cancellation or duplicate intent when relevant, and the visible recovery
   path.
9. Run the focused test, then:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

## Boundaries

- Keep secrets, signing keys, and privileged service credentials off the
  inspectable client.
- Store generated OpenAPI files in a generated-only directory and map them at
  a hand-written repository boundary.
- Do not let code generation overwrite transport policy, domain types, or use
  cases.
- Use Stable by default. If the API change belongs to an explicitly selected
  Weixin AI Alpha flow, also load `weixin-ai-profile`; do not infer Alpha from
  an endpoint name.
