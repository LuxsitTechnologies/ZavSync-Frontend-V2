<script setup lang="ts">
import { computed, useId } from "vue";
import type { FbrReference } from "@/types/fbr";
const props = defineProps<{ label: string; modelValue: string; category: string; references: FbrReference[]; required?: boolean; disabled?: boolean; error?: string }>();
defineEmits<{ "update:modelValue": [value: string] }>();
const inputId = useId();
const values = computed(() => props.references.filter(row => row.category === props.category && row.is_active));
</script>
<template>
  <label class="block">
    <span class="label-caps">{{ label }}</span>
    <input :id="inputId" class="field mt-1.5" :list="`${inputId}-options`" :value="modelValue" :required="required" :disabled="disabled" :aria-invalid="!!error" :aria-describedby="error ? `${inputId}-error` : undefined" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <datalist :id="`${inputId}-options`"><option v-for="row in values" :key="row.id" :value="row.code">{{ row.label }} — {{ row.source }} / {{ row.source_version }}</option></datalist>
    <span v-if="error" :id="`${inputId}-error`" class="text-xs text-danger">{{ error }}</span>
  </label>
</template>
