<script setup>
import { inject, provide, computed } from "vue";
import Schemes from "../views/Schemes.vue";
const audit = inject("audit");
provide("audit", { ...audit, readOnly: computed(() => true) });
</script>
<template><Schemes /></template>
