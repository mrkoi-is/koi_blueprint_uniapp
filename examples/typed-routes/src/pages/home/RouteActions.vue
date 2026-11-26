<script setup lang="ts">
import { openPage, openTab } from "../../bootstrap/navigation";
</script>

<template>
  <view>
    <button id="example-invoice" @tap="openPage('/invoice-pages/detail/index')">
      Invoice details
    </button>
    <button id="example-settings" @tap="openTab('/pages/settings/index')">
      Settings
    </button>
  </view>
</template>
