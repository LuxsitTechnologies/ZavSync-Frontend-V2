<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { companyRepository } from "@/services/platform/company.repository";

setPageMeta("Create Account", "Create a ZavSync account and verify your email.");
const name = ref(""), email = ref(""), password = ref(""), confirmation = ref("");
const loading = ref(false), message = ref(""), error = ref<ApiError | null>(null);
let generation = 0;
async function submit(): Promise<void> {
  if (loading.value) return;
  const token = ++generation;
  loading.value = true; error.value = null; message.value = "";
  try { const response = await companyRepository.register(name.value, email.value, password.value, confirmation.value); if (token === generation) message.value = response.message; }
  catch (cause) { if (token === generation) error.value = cause instanceof ApiError ? cause : new ApiError("Registration could not be submitted."); }
  finally { password.value = ""; confirmation.value = ""; if (token === generation) loading.value = false; }
}
onBeforeUnmount(() => { generation++; password.value = ""; confirmation.value = ""; });
</script>
<template>
  <AuthLayout title="Create Account" subtitle="Verify your email before creating a company. Existing employees should use their invitation or sign in.">
    <form class="space-y-4" @submit.prevent="submit">
      <Field v-model="name" label="Full name" required :error="error?.fields.name" />
      <Field v-model="email" label="Email" type="email" required :error="error?.fields.email" />
      <Field v-model="password" label="Password" type="password" required :error="error?.fields.password" />
      <Field v-model="confirmation" label="Confirm password" type="password" required />
      <p class="text-xs text-content-secondary">Use at least 12 characters. A verification email is sent when registration is available.</p>
      <p v-if="error" role="alert" class="text-sm text-danger">{{ error.message }}</p>
      <p v-if="message" role="status" class="text-sm">{{ message }} Sign in after verifying your email.</p>
      <ZButton type="submit" :disabled="loading">{{ loading ? 'Submitting…' : 'Create Account' }}</ZButton>
    </form>
    <template #footer><RouterLink to="/login" class="text-content-brand underline">Already have an account? Sign in</RouterLink></template>
  </AuthLayout>
</template>
