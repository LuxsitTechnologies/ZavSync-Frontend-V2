<script setup lang="ts">
import { ref } from "vue";
import { MailCheck } from "lucide-vue-next";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Reset password", "Request a password reset link for your ZavSync account.");

const sent = ref(false);
const email = ref("");

function onSubmit() {
  sent.value = true;
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
      <ZButton type="submit" class="w-full justify-center">Send reset link</ZButton>
    </form>

    <template #footer>
      <RouterLink to="/login" class="text-content-brand hover:underline">Back to sign in</RouterLink>
    </template>
  </AuthLayout>
</template>
