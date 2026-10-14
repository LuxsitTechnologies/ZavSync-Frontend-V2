<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AuthLayout from "@/components/zs/AuthLayout.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { companyRepository } from "@/services/platform/company.repository";

setPageMeta("Verify Email", "Confirm your ZavSync account email.");
const route = useRoute();
const message = ref(""), error = ref("");
onMounted(async () => {
  const id = String(route.params.id ?? ""), hash = String(route.params.hash ?? "");
  const query = Object.fromEntries(Object.entries(route.query).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  try { message.value = (await companyRepository.verifyEmail(id, hash, query)).message; }
  catch (cause) { error.value = cause instanceof ApiError ? cause.message : "This verification link could not be accepted."; }
});
</script>
<template><AuthLayout title="Verify Email" subtitle="This link is checked by the ZavSync server."><p v-if="error" role="alert">{{ error }}</p><p v-else role="status">{{ message || 'Verifying…' }}</p><RouterLink to="/login" class="mt-4 inline-block text-content-brand underline">Sign in</RouterLink></AuthLayout></template>
