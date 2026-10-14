<script setup lang="ts">
import Logo from "./Logo.vue";

defineProps<{ title: string; subtitle: string }>();
</script>

<template>
  <div class="grid min-h-screen bg-background lg:grid-cols-2">
    <div class="relative hidden flex-col items-center justify-center bg-brand-900 p-10 lg:flex">
      <div class="flex max-w-full flex-col items-center text-center">
        <Logo tone="dark" class="h-12 max-w-full object-contain xl:h-14" />
        <p class="mt-3 font-sans text-xs tracking-[0.16em] text-white uppercase xl:tracking-[0.2em]">
          Unified. Intelligent. Synchronized.
        </p>
      </div>
      <p class="absolute inset-x-0 bottom-8 text-center text-xs text-brand-300">
        © 2026 ZavSync. All rights reserved.
      </p>
    </div>

    <div class="flex items-center justify-center p-6">
      <div class="w-full max-w-sm">
        <div class="mb-5 flex flex-col items-center text-center lg:hidden">
          <Logo class="h-8 max-w-full object-contain" />
          <p class="mt-2 text-[0.65rem] tracking-[0.12em] text-content-secondary uppercase sm:tracking-[0.16em]">Unified. Intelligent. Synchronized.</p>
        </div>
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
