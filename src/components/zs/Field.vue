<script setup lang="ts">
import { useId } from "vue";

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    type?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    modelValue?: string | null;
    error?: string;
  }>(),
  {
    hint: undefined,
    type: "text",
    required: false,
    disabled: false,
    placeholder: undefined,
    modelValue: "",
    error: undefined,
  },
);
defineEmits<{ "update:modelValue": [value: string] }>();
const inputId = useId();
</script>

<template>
  <label class="block">
    <span :id="`${inputId}-label`" class="label-caps">{{ label }}</span>
    <input
      v-bind="$attrs"
      :id="inputId"
      class="field mt-1.5"
      :type="type"
      :required="required"
      :disabled="disabled"
      :placeholder="placeholder"
      :value="modelValue"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" :id="`${inputId}-error`" class="mt-1 block text-2xs text-danger" role="alert">
      {{ error }}
    </span>
    <span v-else-if="hint" :id="`${inputId}-hint`" class="mt-1 block text-2xs text-content-muted">{{ hint }}</span>
  </label>
</template>
