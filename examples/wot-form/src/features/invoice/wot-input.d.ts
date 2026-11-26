import type { DefineComponent } from "vue";

declare const WdInput: DefineComponent<{
  readonly modelValue: string;
  readonly label: string;
  readonly placeholder: string;
}>;
export default WdInput;
