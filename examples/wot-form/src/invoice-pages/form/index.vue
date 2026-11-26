<script setup lang="ts">
import { ref } from "vue";
import WdButton from "@wot-ui/ui/components/wd-button/wd-button.vue";
import WdInput from "@wot-ui/ui/components/wd-input/wd-input.vue";
import { validateCustomer } from "../../features/invoice/model";

const name = ref("");
const state = ref<"editing" | "invalid" | "saved">("editing");

function submit() {
  state.value = validateCustomer(name.value) ? "saved" : "invalid";
}
</script>

<template>
  <view class="invoice">
    <WdInput v-model="name" label="Customer" placeholder="Customer name" />
    <text v-if="state === 'invalid'" id="invoice-required"
      >Customer name is required.</text
    >
    <WdButton id="invoice-submit" @click="submit">Save invoice</WdButton>
    <text v-if="state === 'saved'" id="invoice-saved">Invoice saved.</text>
  </view>
</template>

<style scoped>
.invoice {
  display: grid;
  gap: 24rpx;
  padding: 32rpx;
}
</style>
