# Project structure

The blueprint repository and a generated application deliberately differ.

## Blueprint repository

```text
koi_blueprint_uniapp/
├── .agent/skills/                task-routed AI workflows
├── .cursor/rules/                lightweight tool bridge
├── docs/                         standards, plans, and ADRs
├── scripts/                      project generator and blueprint checks
├── specs/                        durable acceptance specifications
└── skeleton/                     exact Stable application template
    └── profiles/
        └── weixin-ai-alpha/      present but inactive optional profile
```

The optional profile is copied into a generated application for discoverability,
but no Stable source or manifest entry imports it. Enabling it requires an
explicit compiler-cohort change and manifest edit.

## Generated Stable application

```text
my-uni-app/
├── AGENTS.md
├── .env.example
├── .agent/skills/
├── .cursor/rules/
├── docs/
├── profiles/
│   └── weixin-ai-alpha/
├── specs/
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json
│   ├── pages.json
│   ├── uni.scss
│   ├── bootstrap/
│   ├── core/
│   ├── features/
│   ├── pages/
│   ├── platform/
│   ├── shared/
│   └── stores/
├── tests/
├── scripts/
├── vite.config.ts
├── tsconfig.json
├── renovate.json
├── package.json
└── package-lock.json
```

`src/pages/` contains uni-app route shells. `src/features/` owns business
models, workflows, APIs, and Feature UI. `src/platform/` owns host calls.

Build output is generated, ignored, and disposable:

```text
dist/dev/mp-weixin
dist/build/h5
dist/build/mp-weixin
```

Never nest a Git repository inside `skeleton/`. Never copy `.git`,
`node_modules`, `dist`, `unpackage`, coverage, caches, local environment files,
or credentials into a generated project. Normal generation copies only the
consumer-facing documentation and empty Spec template; blueprint research,
project plans, and active blueprint specs remain at the blueprint root.
