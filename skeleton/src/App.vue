<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";

import { useAppStore } from "./stores/app.store";

const appStore = useAppStore();

onLaunch(() => {
  appStore.markLaunched();
});
</script>

<style lang="scss">
:root,
page {
  --koi-color-page: #f5f7fa;
  --koi-color-surface: #ffffff;
  --koi-color-text: #182230;
  --koi-color-text-muted: #5c6b7a;
  --koi-color-border: #dbe2ea;
  --koi-color-primary: #176b87;
  --koi-color-success: #18865b;
  --koi-color-danger: #ba3a3a;
  --koi-space-page: 32rpx;
  --koi-radius-card: 32rpx;
  --koi-radius-control: 20rpx;
  --koi-shadow-card: 0 20rpx 64rpx rgb(32 56 85 / 10%);

  min-height: 100%;
  margin: 0;
  background: var(--koi-color-page);
  color: var(--koi-color-text);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
}

button::after {
  border: 0;
}
</style>
