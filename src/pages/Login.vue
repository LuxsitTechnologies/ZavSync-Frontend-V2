<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import AuthLayout from "@/components/zs/AuthLayout.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Sign in", "Sign in to your ZavSync workspace.");

const router = useRouter();
const loading = ref(false);
const email = ref("humza@zavtech.io");
const password = ref("demo-password");

function onSubmit() {
  loading.value = true;
  setTimeout(() => router.push("/"), 400);
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
    </form>

    <template #footer>
      <span>Need an account? Ask your workspace admin to send an invite.</span>
    </template>
  </AuthLayout>
</template>
