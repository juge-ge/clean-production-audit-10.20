<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
const portal = ref(null),
  router = useRouter();
function enter(event) {
  if (
    event.origin !== location.origin ||
    event.source !== portal.value?.contentWindow
  )
    return;
  if (
    event.data?.type === "cp-portal-entry" &&
    ["government", "enterprise"].includes(event.data.portal)
  )
    router.push("/login/" + event.data.portal);
}
onMounted(() => window.addEventListener("message", enter));
onBeforeUnmount(() => window.removeEventListener("message", enter));
</script>
<template>
  <iframe
    ref="portal"
    src="./homepage.html"
    title="清洁生产智慧审核平台门户"
    class="original-portal"
  />
</template>
<style scoped>
.original-portal {
  display: block;
  width: 100%;
  height: 100dvh;
  border: 0;
  background: #f5f7fa;
}
</style>
