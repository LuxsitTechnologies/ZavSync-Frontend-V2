<script setup lang="ts">
import { ref } from "vue";
import { MailCheck } from "lucide-vue-next";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { authRepository } from "@/services/auth.repository";
import { ApiError } from "@/services/api/client";

setPageMeta("Reset password", "Request a password reset link for your ZavSync account.");

const sent = ref(false);
const email = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  loading.value = true;
  error.value = null;
  try {
    await authRepository.forgotPassword(email.value);
    sent.value = true;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "Could not request a password reset.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to set a new password.">
    <div v-if="sent" class="panel flex gap-3 p-4">
      <MailCheck class="size-5 shrink-0 text-success" />
      <div>
        <p class="text-sm font-medium text-content">Check your inbox</p>
        <p class="mt-1 text-sm text-content-secondary">
          If an account exists for that address, a reset link is on its way. The link
          expires in 30 minutes.
        </p>
      </div>
    </div>
    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <Field
        v-model="email"
        label="Work email"
        type="email"
        required
        placeholder="you@company.com"
        hint="Use the address your workspace invite was sent to."
      />
      <ValidationMessage :message="error" />
      <ZButton type="submit" :disabled="loading" class="w-full justify-center">{{ loading ? "Sending…" : "Send reset link" }}</ZButton>
    </form>

    <template #footer>
      <RouterLink to="/login" class="text-content-brand hover:underline">Back to sign in</RouterLink>
    </template>
  </AuthLayout>
</template>
