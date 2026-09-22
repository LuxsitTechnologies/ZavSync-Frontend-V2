<script setup lang="ts">
/**
 * Monetary input bound to INTEGER minor units. The visible value is a decimal
 * string; the model value never leaves integer space, so no accounting figure
 * is ever produced by float arithmetic.
 */
import { computed, ref, watch } from "vue";

import { parseMoneyInput, toMoneyInput } from "@/lib/money";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import type { Money } from "@/types/accounting";

const props = withDefaults(
  defineProps<{
    modelValue: Money;
    label?: string;
    currency?: string;
    allowNegative?: boolean;
    disabled?: boolean;
    error?: string | null;
    placeholder?: string;
    align?: "left" | "right";
  }>(),
  {
    label: undefined,
    currency: "PKR",
    allowNegative: false,
    disabled: false,
    error: null,
    placeholder: "0.00",
    align: "right",
  },
);

const emit = defineEmits<{ "update:modelValue": [value: Money] }>();

const text = ref(props.modelValue ? toMoneyInput(props.modelValue) : "");
const localError = ref<string | null>(null);

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseMoneyInput(text.value, { allowNegative: props.allowNegative });
    if (parsed !== value) text.value = value ? toMoneyInput(value) : "";
  },
);

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  text.value = raw;
  if (raw.trim() === "") {
    localError.value = null;
    emit("update:modelValue", 0);
    return;
  }
  const parsed = parseMoneyInput(raw, { allowNegative: props.allowNegative });
  if (parsed === null) {
    localError.value = props.allowNegative
      ? "Enter an amount with up to two decimals."
      : "Enter a positive amount with up to two decimals.";
    return;
  }
  localError.value = null;
  emit("update:modelValue", parsed);
}

function onBlur() {
  if (text.value.trim() === "") return;
  const parsed = parseMoneyInput(text.value, { allowNegative: props.allowNegative });
  if (parsed !== null) text.value = toMoneyInput(parsed);
}

const message = computed(() => props.error ?? localError.value);
</script>

<template>
  <label class="block">
    <span v-if="label" class="label-caps">{{ label }}</span>
    <span class="relative mt-1.5 block">
      <span class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-2xs text-content-muted">
        {{ currency }}
      </span>
      <input
        :value="text"
        :disabled="disabled"
        :placeholder="placeholder"
        inputmode="decimal"
        class="field num pl-10"
        :class="[align === 'right' ? 'text-right' : '', message ? 'border-danger' : '']"
        :aria-invalid="Boolean(message)"
        @input="onInput"
        @blur="onBlur"
      />
    </span>
    <ValidationMessage :message="message" />
  </label>
</template>
