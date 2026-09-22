<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Check, X } from "lucide-vue-next";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Set your password", "Create a password to finish activating your ZavSync account.");

const RULES = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const router = useRouter();
const password = ref("");
const confirm = ref("");

const passed = computed(() => RULES.filter((r) => r.test(password.value)).length);
const valid = computed(
  () => passed.value === RULES.length && password.value === confirm.value && confirm.value.length > 0,
);
const confirmHint = computed(() =>
  confirm.value.length > 0 && confirm.value !== password.value ? "Passwords don't match." : undefined,
);

function onSubmit() {
  router.push("/");
}
</script>

<template>
  <AuthLayout title="Set your password" subtitle="Welcome to ZavSync — choose a password to activate your account.">
    <form class="space-y-4" @submit.prevent="onSubmit">
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

      <ZButton type="submit" :disabled="!valid" class="w-full justify-center">Activate account</ZButton>
    </form>

    <template #footer>
      <RouterLink to="/login" class="text-content-brand hover:underline">Back to sign in</RouterLink>
    </template>
  </AuthLayout>
</template>
