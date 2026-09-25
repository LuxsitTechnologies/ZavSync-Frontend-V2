<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Check, X } from "lucide-vue-next";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { platformRepository } from "@/services/platform/repository";
import { ApiError } from "@/services/api/client";
import { authRepository } from "@/services/auth.repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Set your password", "Create a password to finish activating your ZavSync account.");

const RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const router = useRouter();
const route = useRoute();
const company = useCompanyStore();
const name = ref("");
const resetEmail = computed(() => typeof route.query.email === "string" ? route.query.email : "");
const resetToken = computed(() => typeof route.query.reset === "string" ? route.query.reset : "");
const isPasswordReset = computed(() => resetEmail.value.length > 0 && resetToken.value.length > 0);
const password = ref("");
const confirm = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const passed = computed(() => RULES.filter((r) => r.test(password.value)).length);
const valid = computed(
  () => passed.value === RULES.length && password.value === confirm.value && confirm.value.length > 0 && (isPasswordReset.value || name.value.trim().length > 0),
);
const confirmHint = computed(() =>
  confirm.value.length > 0 && confirm.value !== password.value ? "Passwords don't match." : undefined,
);

async function onSubmit() {
  const invitationToken = typeof route.query.invitation === "string" ? route.query.invitation : "";
  if (!invitationToken && !isPasswordReset.value) {
    error.value = "This invitation link is incomplete.";
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    if (isPasswordReset.value) {
      await authRepository.resetPassword({email:resetEmail.value,token:resetToken.value,password:password.value,password_confirmation:confirm.value});
      await router.push("/login");
      return;
    }
    await platformRepository.acceptInvitation(invitationToken, { name: name.value, password: password.value });
    if (company.currentUser.id) {
      company.hydrate(await authRepository.me());
      await router.push("/");
    } else {
      await router.push("/login");
    }
  } catch (reason) {
    if (!isPasswordReset.value && reason instanceof ApiError && reason.errorCode === "INVITATION_AUTHENTICATION_REQUIRED") {
      await router.push({ path: "/login", query: { redirect: route.fullPath } });
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : "Could not accept this invitation.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Set your password" subtitle="Welcome to ZavSync — choose a password to activate your account.">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <Field v-if="!isPasswordReset" v-model="name" label="Full name" autocomplete="name" required />
      <Field v-model="password" label="New password" type="password" required />
      <Field v-model="confirm" label="Confirm password" type="password" required :hint="confirmHint" />

      <ul class="space-y-1.5">
        <li
          v-for="rule in RULES"
          :key="rule.label"
          :class="`flex items-center gap-2 text-xs ${rule.test(password) ? 'text-success-strong' : 'text-content-muted'}`"
        >
          <Check v-if="rule.test(password)" class="size-3.5" />
          <X v-else class="size-3.5" />
          {{ rule.label }}
        </li>
      </ul>

      <ValidationMessage :message="error" />
      <ZButton type="submit" :disabled="!valid || loading" class="w-full justify-center">{{ loading ? "Activating…" : "Activate account" }}</ZButton>
    </form>

    <template #footer>
      <RouterLink to="/login" class="text-content-brand hover:underline">Back to sign in</RouterLink>
    </template>
  </AuthLayout>
</template>
