<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from "vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import type { PortalSettings, PortalSettingsInput } from "@/types/portalSettings";
import { useFbrContext } from "./context";

const { company, companyId, current } = useFbrContext();
const state = ref<PortalSettings | null>(null);
const form = reactive<PortalSettingsInput>({ footer: null, declaration: null, default_notes: null, number_prefix_display: null, show_seller_email: true, show_seller_phone: true, show_seller_address: true });
const credential = ref(""), logo = ref<File | null>(null), confirming = ref<"reset" | "credential" | null>(null);
const loading = ref(false), busy = ref(false), error = ref<ApiError | null>(null), message = ref("");
let generation = 0;
function accept(result: PortalSettings): void {
  state.value = result;
  Object.assign(form, {
    footer: result.presentation.footer, declaration: result.presentation.declaration,
    default_notes: result.presentation.default_notes, number_prefix_display: result.presentation.number_prefix_display,
    show_seller_email: result.presentation.show_seller_email, show_seller_phone: result.presentation.show_seller_phone,
    show_seller_address: result.presentation.show_seller_address,
  });
}
async function load(): Promise<void> {
  const token = ++generation;
  state.value = null; loading.value = true; error.value = null; message.value = "";
  try { const result = await fbrRepository.portalSettings(companyId); if (current() && token === generation) accept(result); }
  catch (cause) { if (current() && token === generation) error.value = cause instanceof ApiError ? cause : new ApiError("Portal Settings unavailable."); }
  finally { if (current() && token === generation) loading.value = false; }
}
async function mutate(action: (version: number) => Promise<PortalSettings>, notice: string): Promise<void> {
  if (!current() || !state.value || busy.value || !company.hasPermission("portal.settings.manage")) return;
  const token = generation, version = state.value.presentation.version;
  busy.value = true; error.value = null; message.value = "";
  try { const result = await action(version); if (current() && token === generation) { accept(result); message.value = notice; } }
  catch (cause) {
    if (current() && token === generation) {
      error.value = cause instanceof ApiError ? cause : new ApiError("Portal Settings could not be updated.");
      if (error.value.errorCode === "PORTAL_SETTINGS_VERSION_STALE") {
        const stale = error.value;
        await load();
        if (current()) error.value = stale;
      }
    }
  } finally { busy.value = false; credential.value = ""; }
}
function selectLogo(event: Event): void { logo.value = (event.target as HTMLInputElement).files?.[0] ?? null; }
function confirm(): void {
  const selected = confirming.value; confirming.value = null;
  if (selected === "reset") void mutate(version => fbrRepository.resetPortalSettings(companyId, version), "Portal Settings reset to server defaults.");
  if (selected === "credential") void mutate(version => fbrRepository.removePortalCredential(companyId, version), "FBR credential removed. Connection must be verified again.");
}
void load();
onBeforeUnmount(() => { generation++; credential.value = ""; logo.value = null; });
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-content-secondary">Set the details shown on new invoices and credit notes. Submitted documents keep their original details.</p>
    <p v-if="loading" role="status">Loading Portal Settings…</p>
    <div v-if="error" role="alert" class="panel p-4 text-danger">{{ error.message }} <ZButton variant="outline" @click="load">Reload</ZButton></div>
    <p v-if="message" role="status" class="panel p-4">{{ message }}</p>
    <template v-if="state">
      <Panel title="Invoice Presentation" body-class="space-y-3 p-4">
        <p>{{ company.activeCompany?.name }} · Document logo {{ state.presentation.logo_document_id ? 'configured' : 'not configured' }}</p>
        <label class="block">Invoice Footer <textarea v-model="form.footer" class="field mt-1 block w-full" maxlength="5000" :disabled="!company.hasPermission('portal.settings.manage') || busy"></textarea></label>
        <label class="block">Invoice Declaration <textarea v-model="form.declaration" class="field mt-1 block w-full" maxlength="5000" :disabled="!company.hasPermission('portal.settings.manage') || busy"></textarea></label>
        <label class="block">Default Document Notes <textarea v-model="form.default_notes" class="field mt-1 block w-full" maxlength="5000" :disabled="!company.hasPermission('portal.settings.manage') || busy"></textarea></label>
        <label class="block">Invoice Prefix / Presentation <input v-model="form.number_prefix_display" class="field mt-1 block w-full" maxlength="20" :disabled="!company.hasPermission('portal.settings.manage') || busy" /></label>
        <p class="text-sm font-medium">Seller / Contact Presentation</p>
        <label class="flex gap-2"><input v-model="form.show_seller_email" type="checkbox" :disabled="!company.hasPermission('portal.settings.manage') || busy" />Show seller email</label>
        <label class="flex gap-2"><input v-model="form.show_seller_phone" type="checkbox" :disabled="!company.hasPermission('portal.settings.manage') || busy" />Show seller phone</label>
        <label class="flex gap-2"><input v-model="form.show_seller_address" type="checkbox" :disabled="!company.hasPermission('portal.settings.manage') || busy" />Show seller address</label>
        <div v-if="company.hasPermission('portal.settings.manage')" class="flex flex-wrap gap-2"><ZButton :disabled="busy" @click="mutate(version => fbrRepository.savePortalSettings(companyId, version, { ...form }), 'Portal Settings saved.')">Save Settings</ZButton><ZButton variant="outline" :disabled="busy" @click="confirming = 'reset'">Reset to Defaults</ZButton></div>
      </Panel>
      <Panel title="Document Logo" body-class="space-y-3 p-4">
        <p>Upload your company logo as PNG, JPEG or WebP (up to 2 MB).</p>
        <input type="file" aria-label="Document logo file" accept=".png,.jpg,.jpeg,.webp" :disabled="!company.hasPermission('portal.settings.manage') || busy" @change="selectLogo" />
        <ZButton v-if="company.hasPermission('portal.settings.manage')" variant="outline" :disabled="busy || !logo" @click="mutate(version => fbrRepository.uploadPortalLogo(companyId, version, logo!), 'Logo saved.'); logo = null">Upload Logo</ZButton>
      </Panel>
      <Panel title="FBR Credential" body-class="space-y-3 p-4">
        <p>FBR credential: <strong>{{ state.fbr_configuration.credential_configured ? 'Configured' : 'Not configured' }}</strong>. The saved credential is never shown.</p>
        <template v-if="company.hasPermission('portal.settings.manage') && company.hasPermission('fbr.configuration.manage')">
          <label>Replacement credential <input v-model="credential" class="field mt-1 block w-full" type="password" autocomplete="off" :disabled="busy" /></label>
          <div class="flex flex-wrap gap-2"><ZButton :disabled="busy || credential.length < 8" @click="mutate(version => fbrRepository.replacePortalCredential(companyId, version, credential), 'Credential replaced. Connection is not verified.')">Replace Credential</ZButton><ZButton v-if="state.fbr_configuration.credential_configured" variant="outline" :disabled="busy" @click="confirming = 'credential'">Remove Credential</ZButton></div>
        </template>
      </Panel>
    </template>
    <ConfirmDialog :open="confirming !== null" :title="confirming === 'reset' ? 'Reset Portal Settings?' : 'Remove FBR credential?'" :message="confirming === 'reset' ? 'This resets future invoice presentation defaults. Submitted snapshots remain unchanged.' : 'The FBR connection will no longer have a configured credential.'" :busy="busy" tone="danger" @cancel="confirming = null" @confirm="confirm" />
  </div>
</template>
