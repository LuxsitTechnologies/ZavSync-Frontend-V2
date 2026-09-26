<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { aiRepository } from "@/services/ai/repository";
import { useCompanyStore } from "@/stores/company";

const router = useRouter();
const company = useCompanyStore();

onMounted(async () => {
  const conversations = await aiRepository.conversations(company.activeCompanyId);
  const first = conversations.data[0];
  if (first) await router.replace(`/knowledge/chat/${first.id}`);
  else {
    const created = await aiRepository.createConversation(company.activeCompanyId);
    await router.replace(`/knowledge/chat/${created.id}`);
  }
});
</script>

<template><div class="grid min-h-screen place-items-center bg-background text-sm text-content-muted">Opening ZavSync Copilot…</div></template>
