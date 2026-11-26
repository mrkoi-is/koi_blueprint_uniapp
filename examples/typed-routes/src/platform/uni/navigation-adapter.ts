import type { StackPath, TabPath } from "./page-paths";

export function openPage(path: StackPath) {
  return uni.navigateTo({ url: path });
}

export function openTab(path: TabPath) {
  return uni.switchTab({ url: path });
}
