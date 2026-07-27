<script setup lang="ts">
withDefaults(
  defineProps<{
    body?: string;
    errorMessage?: string;
    status: "loading" | "ready" | "error";
    title?: string;
  }>(),
  {
    body: "",
    errorMessage: "",
    title: "",
  },
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <view class="state-card" aria-live="polite">
    <template v-if="status === 'loading'">
      <text class="state-card__eyebrow">LOADING</text>
      <text class="state-card__title">Preparing your workspace…</text>
    </template>

    <template v-else-if="status === 'ready'">
      <text class="state-card__eyebrow">READY</text>
      <text class="state-card__title">{{ title }}</text>
      <text class="state-card__body">{{ body }}</text>
    </template>

    <template v-else>
      <text class="state-card__eyebrow state-card__eyebrow--error">
        RECOVERABLE
      </text>
      <text class="state-card__title">Something needs attention</text>
      <text class="state-card__body">{{ errorMessage }}</text>
      <button class="state-card__action" @tap="emit('retry')">Try again</button>
    </template>
  </view>
</template>

<style scoped lang="scss">
.state-card {
  display: flex;
  flex-direction: column;
  padding: 48rpx;
  border: 2rpx solid var(--koi-color-border);
  border-radius: var(--koi-radius-card);
  background: var(--koi-color-surface);
  box-shadow: var(--koi-shadow-card);
}

.state-card__eyebrow {
  margin-bottom: 20rpx;
  color: var(--koi-color-success);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}

.state-card__eyebrow--error {
  color: var(--koi-color-danger);
}

.state-card__title {
  color: var(--koi-color-text);
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.25;
}

.state-card__body {
  margin-top: 24rpx;
  color: var(--koi-color-text-muted);
  font-size: 28rpx;
  line-height: 1.7;
}

.state-card__action {
  min-height: 88rpx;
  margin-top: 36rpx;
  border-radius: var(--koi-radius-control);
  background: var(--koi-color-primary);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;
}
</style>
