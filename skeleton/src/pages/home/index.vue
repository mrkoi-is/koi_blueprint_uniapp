<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { reactive } from "vue";

import { appServices } from "../../bootstrap/container";
import HomeState from "../../features/home/components/HomeState.vue";

interface HomeViewState {
  body: string;
  errorMessage: string;
  status: "loading" | "ready" | "error";
  title: string;
}

const state = reactive<HomeViewState>({
  body: "",
  errorMessage: "",
  status: "loading",
  title: "",
});

async function loadHome(): Promise<void> {
  state.errorMessage = "";
  state.status = "loading";

  const result = await appServices.home.load.execute();
  if (result.status === "ready") {
    state.body = result.welcome.body;
    state.status = "ready";
    state.title = result.welcome.title;
    return;
  }

  state.errorMessage = result.message;
  state.status = "error";
  appServices.feedback.error(result.message);
}

onLoad(() => {
  void loadHome();
});
</script>

<template>
  <view class="home">
    <text class="home__brand">KOI / UNI-APP</text>
    <HomeState
      :body="state.body"
      :error-message="state.errorMessage"
      :status="state.status"
      :title="state.title"
      @retry="loadHome"
    />
  </view>
</template>

<style scoped lang="scss">
.home {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 96rpx var(--koi-space-page) calc(64rpx + env(safe-area-inset-bottom));
}

.home__brand {
  display: block;
  margin-bottom: 32rpx;
  color: var(--koi-color-primary);
  font-size: 24rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
}
</style>
