<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { authRepository } from "@/services/auth.repository";
import { ApiError, isApiConfigured } from "@/services/api/client";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Sign in", "Sign in to your ZavSync workspace.");

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const email = ref(isApiConfigured() ? "finance@example.com" : "humza@zavtech.io");
const password = ref(isApiConfigured() ? "password" : "demo-password");
const companyStore = useCompanyStore();

async function onSubmit() {
  loading.value = true;
  error.value = null;
  try {
    if (isApiConfigured()) companyStore.hydrate(await authRepository.login(email.value, password.value));
    await router.push("/");
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "Could not sign in.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Sign in" subtitle="Use your work email to access your company workspace.">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <Field
        v-model="email"
        label="Work email"
        type="email"
        required
        placeholder="you@company.com"
      />
      <Field v-model="password" label="Password" type="password" required />
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center gap-2 text-content-secondary">
          <input type="checkbox" class="size-3.5 accent-[var(--primary)]" checked />
          Keep me signed in
        </label>
        <RouterLink to="/forgot-password" class="text-content-brand hover:underline">
          Forgot password?
        </RouterLink>
      </div>
      <ZButton type="submit" :disabled="loading" class="w-full justify-center">
        {{ loading ? "Signing in…" : "Sign in" }}
      </ZButton>
      <ValidationMessage :message="error" />
    </form>

    <template #footer>
      <span>Need an account? Ask your workspace admin to send an invite.</span>
    </template>
  </AuthLayout>
</template>
