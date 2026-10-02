<script setup lang="ts">
import { ref, watch } from "vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import type { FbrConfigurationInput } from "@/types/fbr";
import { useFbrContext } from "./context";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import FbrError from "./FbrError.vue";
import FbrReferenceInput from "./FbrReferenceInput.vue";
const { company, companyId, current } = useFbrContext();
const form = ref<FbrConfigurationInput>({ seller_tax_identifier: "", seller_business_name: "", seller_province: "", seller_address: "", environment: "SANDBOX" });
const credential = ref("");
const confirmOpen = ref(false), saved = ref(false);
const { data, loading, error, refresh } = useAsyncData(async () => {
  try { return await fbrRepository.configuration(companyId); } catch (cause) { if (cause instanceof ApiError && cause.status === 404) return null; throw cause; }
});
watch(data, value => {
  if (value) form.value = { seller_tax_identifier: value.seller_tax_identifier, seller_business_name: value.seller_business_name, seller_province: value.seller_province, seller_address: value.seller_address, environment: value.environment };
  credential.value = "";
});
const refs = useAsyncData(() => fbrRepository.references(companyId));
const mutation = useMutation(async () => {
  if (!current() || !company.hasPermission("fbr.configuration.manage")) return;
  saved.value = false;
  try {
    const result = await fbrRepository.saveConfiguration(companyId, { ...form.value, ...(credential.value ? { credential: credential.value } : {}) });
    if (current()) { data.value = result; saved.value = true; confirmOpen.value = false; }
  } finally { credential.value = ""; }
});
function save() { if (!mutation.saving.value && current()) void mutation.run(); }
</script>
<template>
  <AsyncSection :loading="loading" :error="error" @retry="refresh">
    <form class="space-y-4" @submit.prevent="confirmOpen = true">
      <Panel title="FBR configuration" body-class="space-y-4 p-4">
        <p class="text-sm">Connection: {{ data?.connection_state ?? 'Not configured' }} · Credential: {{ data?.credential_configured ? 'Configured' : 'Not configured' }}</p>
        <p v-if="data?.last_error" class="text-sm text-warning">{{ data.last_error }}</p>
        <p class="text-xs text-content-muted">Last verified: {{ data?.last_verified_at ?? 'Never' }}. Saving configuration does not verify the provider connection.</p>
        <p v-if="saved" role="status" class="text-success">Configuration saved. Connection remains unverified.</p>
        <FbrError :error="mutation.error.value" />
        <fieldset :disabled="!company.hasPermission('fbr.configuration.manage') || mutation.saving.value" class="grid gap-4 md:grid-cols-2">
          <Field v-model="form.seller_business_name" label="Seller business name" aria-label="Seller business name" required maxlength="255" />
          <Field v-model="form.seller_tax_identifier" label="Seller NTN / CNIC" aria-label="Seller NTN / CNIC" required pattern="[0-9]{7}|[0-9]{13}" maxlength="13" />
          <FbrReferenceInput v-model="form.seller_province" label="Seller province" category="PROVINCE" :references="refs.data.value ?? []" required />
          <Field v-model="form.seller_address" label="Seller address" aria-label="Seller address" required maxlength="2000" />
          <label><span class="label-caps">Environment</span><select v-model="form.environment" class="field mt-1.5"><option>SANDBOX</option><option>PRODUCTION</option></select></label>
          <Field v-model="credential" label="Replacement credential" aria-label="Replacement credential" type="password" autocomplete="new-password" minlength="8" maxlength="4000" hint="Leave blank to retain the credential in the same environment. Changing environment without a replacement clears it." />
        </fieldset>
        <p class="text-xs text-content-muted">Province must match an active server reference code. Catalog content is not certified regulatory data.</p>
        <FbrError :error="refs.error.value" />
        <ZButton v-if="refs.error.value" variant="outline" @click="refs.refresh">Retry reference data</ZButton>
        <ZButton v-if="company.hasPermission('fbr.configuration.manage')" type="submit" :disabled="mutation.saving.value">Save configuration</ZButton>
        <p v-else class="text-sm">You have read-only configuration access.</p>
      </Panel>
    </form>
    <ConfirmDialog :open="confirmOpen" title="Save FBR configuration?" message="This changes seller or credential settings for the selected company and marks the connection unverified. An environment change without a replacement credential clears the old credential." confirm-label="Confirm configuration" :busy="mutation.saving.value" @cancel="confirmOpen = false" @confirm="save"><FbrError :error="mutation.error.value" /></ConfirmDialog>
  </AsyncSection>
</template>
