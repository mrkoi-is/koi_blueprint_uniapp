# ADR 0001: uni-app for H5 and WeChat Mini Program

- Status: Accepted
- Date: 2026-07-27

## Context

The blueprint has two committed targets: H5 and WeChat Mini Program. A native
WeChat baseline cannot deliver H5 from the same Feature code, while a
many-framework or all-platform starter would add dependencies and decisions
that current products do not need.

AI-assisted development also needs a headless CLI build, stable source
boundaries, and one repeatable acceptance command.

## Decision

Use the uni-app CLI with Vue 3, TypeScript, Vite, and Pinia. Support H5 and
`mp-weixin` in the Stable profile and require both production builds before
completion.

Keep business code in small Feature modules, pages as thin route/lifecycle
shells, dependencies in a composition root, and host calls behind platform
adapters. Pin all DCloud compiler packages to one tested release cohort.

Keep preview WeChat AI capabilities outside Stable under
`profiles/weixin-ai-alpha/`. The profile contains explicit activation
instructions and templates, is never imported by the Stable skeleton, and must
preserve an H5 unsupported/fallback path plus the Stable dual-build gate.

## Consequences

- H5 and WeChat share Feature models, workflows, API mapping, and most UI.
- Platform differences remain visible and testable instead of leaking through
  Feature code.
- Generated target code may require debugging through source maps and the
  corresponding platform tools.
- Vue, Vite, Pinia, and DCloud compiler packages cannot be upgraded
  independently.
- WeChat-only and Alpha behavior still requires DevTools or real-device
  evidence.
- Supporting another platform requires a new tested profile or ADR, not merely
  installing another compiler package.

## Alternatives rejected

- Native WeChat: direct platform access, but no shared H5 delivery.
- Taro/React: introduces a second UI ecosystem without a React requirement.
- All uni-app targets by default: increases dependency and validation surface.
- Weixin AI Alpha in Stable: makes the universal baseline depend on preview
  capability availability.

## Primary references

- [uni-app CLI](https://uniapp.dcloud.net.cn/worktile/CLI.html)
- [uni-app compiler](https://uniapp.dcloud.net.cn/tutorial/compiler)
- [Conditional compilation](https://uniapp.dcloud.net.cn/tutorial/platform.html)
- [TypeScript support](https://uniapp.dcloud.net.cn/tutorial/typescript-subject.html)
- [Pinia in uni-app](https://uniapp.dcloud.net.cn/tutorial/vue3-pinia.html)
