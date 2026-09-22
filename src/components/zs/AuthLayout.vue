<script setup lang="ts">
import Logo from "./Logo.vue";

defineProps<{ title: string; subtitle: string }>();
</script>

<template>
  <div class="grid min-h-screen bg-background lg:grid-cols-2">
    <div class="relative hidden flex-col items-center justify-center bg-brand-900 p-10 lg:flex">
      <div class="text-center">
        <Logo tone="dark" class="mx-auto h-20 w-auto" />
        <p class="mt-4 font-sans text-xs tracking-[0.22em] text-white uppercase">
          Unified. Intelligent. Synchronized.
        </p>
      </div>
      <p class="absolute inset-x-0 bottom-8 text-center text-xs text-brand-300">
        © 2026 ZavSync. All rights reserved.
      </p>
    </div>

    <div class="flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <Logo class="mx-auto h-8 lg:hidden" />
        <h1 class="mt-4 text-xl font-semibold tracking-tight text-content lg:mt-0">
          {{ title }}
        </h1>
        <p class="mt-1.5 text-sm text-content-secondary">{{ subtitle }}</p>

        <div class="mt-6 space-y-4"><slot /></div>
        <div v-if="$slots.footer" class="mt-6 text-sm text-content-secondary">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>
