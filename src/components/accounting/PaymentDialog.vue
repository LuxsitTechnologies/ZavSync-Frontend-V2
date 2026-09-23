<script setup lang="ts">
/**
 * Shared receipt / payment capture for AR and AP. Full or partial: the amount
 * is validated against the outstanding balance, and the backend performs the
 * actual posting (Dr Bank / Cr AR, or Dr AP / Cr Bank).
 */
import { computed, ref, watch } from "vue";

import AccountSelect from "./AccountSelect.vue";
import MoneyInput from "./MoneyInput.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { formatMoney } from "@/lib/money";
import type { Money, PaymentInput, PaymentMethod } from "@/types/accounting";

const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: "receipt" | "payment";
    documentNumber: string;
    partyName: string;
    total: Money;
    paid: Money;
    outstanding: Money;
    saving?: boolean;
    serverError?: string | null;
    fieldErrors?: Record<string, string>;
  }>(),
  { saving: false, serverError: null, fieldErrors: () => ({}) },
);

const emit = defineEmits<{ close: []; submit: [value: PaymentInput] }>();

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

const amount = ref<Money>(props.outstanding);
const paymentDate = ref(new Date().toISOString().slice(0, 10));
const method = ref<PaymentMethod>("bank_transfer");
const bankAccountId = ref<string | null>(null);
const reference = ref("");
const note = ref("");

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    amount.value = props.outstanding;
    paymentDate.value = new Date().toISOString().slice(0, 10);
    method.value = "bank_transfer";
    reference.value = "";
    note.value = "";
  },
);

const localError = computed(() => {
  if (amount.value <= 0) return "Enter an amount greater than zero.";
  if (amount.value > props.outstanding) return "The amount cannot exceed the outstanding balance.";
  return null;
});

const remaining = computed(() => props.outstanding - Math.min(amount.value, props.outstanding));
const isFull = computed(() => amount.value === props.outstanding);

function submit() {
  if (localError.value) return;
  emit("submit", {
    amount: amount.value,
    payment_date: paymentDate.value,
    method: method.value,
    bank_account_id: bankAccountId.value,
    reference: reference.value,
    note: note.value,
  });
}
</script>

<template>
  <SidePanel
    :open="open"
    :title="mode === 'receipt' ? 'Record customer receipt' : 'Record supplier payment'"
    :description="`${documentNumber} · ${partyName}`"
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <dl class="grid grid-cols-3 gap-2">
        <div class="panel p-3">
          <dt class="label-caps">Document total</dt>
          <dd class="num mt-1 text-sm font-semibold text-content">{{ formatMoney(total) }}</dd>
        </div>
        <div class="panel p-3">
          <dt class="label-caps">Already settled</dt>
          <dd class="num mt-1 text-sm font-semibold text-content">{{ formatMoney(paid) }}</dd>
        </div>
        <div class="panel p-3">
          <dt class="label-caps">Outstanding</dt>
          <dd class="num mt-1 text-sm font-semibold text-content-brand">{{ formatMoney(outstanding) }}</dd>
        </div>
      </dl>

      <div class="flex gap-2">
        <ZButton variant="outline" @click="amount = outstanding">Full amount</ZButton>
        <ZButton variant="ghost" @click="amount = Math.round(outstanding / 2)">Half</ZButton>
      </div>

      <MoneyInput
        v-model="amount"
        label="Amount"
        :error="fieldErrors['amount'] ?? localError"
      />

      <label class="block">
        <span class="label-caps">Payment date</span>
        <input v-model="paymentDate" type="date" class="field mt-1.5" />
        <ValidationMessage :message="fieldErrors['payment_date'] ?? null" />
      </label>

      <label class="block">
        <span class="label-caps">Method</span>
        <select v-model="method" class="field mt-1.5">
          <option v-for="m in METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </label>

      <AccountSelect
        v-model="bankAccountId"
        :label="mode === 'receipt' ? 'Received into' : 'Paid from'"
        :types="['asset']"
        :error="fieldErrors['bank_account_id'] ?? null"
      />

      <label class="block">
        <span class="label-caps">Reference</span>
        <input v-model="reference" class="field mt-1.5" placeholder="Cheque no. / transfer reference" />
      </label>

      <label class="block">
        <span class="label-caps">Note</span>
        <textarea v-model="note" rows="2" class="field mt-1.5" placeholder="Optional" />
      </label>

      <p class="rounded-md bg-surface-sunken p-3 text-2xs text-content-secondary">
        {{
          isFull
            ? "This settles the document in full."
            : `Partial payment — ${formatMoney(remaining)} will remain outstanding.`
        }}
        The journal ({{ mode === "receipt" ? "Dr Bank / Cr Accounts Receivable" : "Dr Accounts Payable / Cr Bank" }})
        is created by the accounting backend.
      </p>

      <ValidationMessage :message="serverError" />
    </div>

    <template #footer>
      <ZButton variant="outline" :disabled="saving" @click="$emit('close')">Cancel</ZButton>
      <ZButton :disabled="saving || Boolean(localError)" @click="submit">
        {{ saving ? "Recording…" : "Record payment" }}
      </ZButton>
    </template>
  </SidePanel>
</template>
