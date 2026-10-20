<script setup>
import { zhCN, dateZhCN } from "naive-ui";
import { storageStatus } from "./data/store";
const theme = {
  common: {
    primaryColor: "#409eff",
    primaryColorHover: "#66b1ff",
    primaryColorPressed: "#337ecc",
    borderRadius: "4px",
    fontFamily:
      '"Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", Arial, sans-serif',
    fontSize: "14px",
    textColorBase: "#303133",
  },
  Button: { fontWeight: "400" },
  Card: { borderRadius: "6px" },
};
</script>
<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="theme"
    ><n-message-provider
      ><n-dialog-provider
        ><div v-if="storageStatus.error" class="storage-error">
          {{ storageStatus.error }}
        </div>
        <router-view /></n-dialog-provider></n-message-provider
  ></n-config-provider>
</template>
