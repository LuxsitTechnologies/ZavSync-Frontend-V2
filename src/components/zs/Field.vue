<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    hint?: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    modelValue?: string;
  }>(),
  { hint: undefined, type: "text", required: false, placeholder: undefined, modelValue: "" },
);
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <label class="block">
    <span class="label-caps">{{ label }}</span>
    <input
      class="field mt-1.5"
      :type="type"
      :required="required"
      :placeholder="placeholder"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="hint" class="mt-1 block text-2xs text-content-muted">{{ hint }}</span>
  </label>
</template>
