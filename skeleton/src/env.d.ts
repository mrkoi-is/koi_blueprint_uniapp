/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL_LOCAL?: string;
    readonly VITE_API_BASE_URL_PRODUCTION?: string;
    readonly VITE_API_BASE_URL_STAGING?: string;
    readonly VITE_REQUEST_TIMEOUT_MS?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent;
  export default component;
}

export {};
