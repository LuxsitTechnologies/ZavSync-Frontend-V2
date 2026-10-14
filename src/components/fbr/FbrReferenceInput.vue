<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import type { FbrReference } from "@/types/fbr";
import { fbrRepository } from "@/services/fbr/repository";
import { ApiError } from "@/services/api/client";
import { useCompanyStore } from "@/stores/company";
const props = defineProps<{ label: string; modelValue: string; category: string; references: FbrReference[]; required?: boolean; disabled?: boolean; error?: string }>();
defineEmits<{ "update:modelValue": [value: string] }>();
const inputId = useId();
const company = useCompanyStore();
const searched = ref<FbrReference[]>([]), searchPage = ref(1), lastPage = ref(1);
const searchError = ref<ApiError | null>(null), searching = ref(false);
let generation = 0;
const values = computed(() => [...new Map([...props.references.filter(row => row.category === props.category && row.is_active), ...searched.value].map(row => [row.code, row])).values()]);
async function search(page = 1): Promise<void> {
  if (props.category !== "HS_CODE" || props.modelValue.trim().length < 2 || !company.hasPermission("fbr.configuration.view")) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = ++generation;
  searching.value = true; searchError.value = null;
  try {
    const result = await fbrRepository.searchReferences(id, props.category, props.modelValue.trim(), page);
    if (id === company.activeCompanyId && version === company.contextVersion && generation === token && !company.switching) {
      searched.value = result.data; searchPage.value = result.meta.current_page; lastPage.value = result.meta.last_page;
    }
  } catch (cause) {
    if (id === company.activeCompanyId && version === company.contextVersion && generation === token) searchError.value = cause instanceof ApiError ? cause : new ApiError("HS code search unavailable.");
  } finally { if (generation === token) searching.value = false; }
}
watch([() => company.contextVersion, () => props.modelValue], () => { generation++; searched.value = []; searchPage.value = 1; lastPage.value = 1; searchError.value = null; });
</script>
<template>
  <label class="block">
    <span class="label-caps">{{ label }}</span>
    <input :id="inputId" class="field mt-1.5" :list="`${inputId}-options`" :value="modelValue" :required="required" :disabled="disabled" :aria-invalid="!!error" :aria-describedby="error ? `${inputId}-error` : undefined" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <datalist :id="`${inputId}-options`"><option v-for="row in values" :key="row.id" :value="row.code">{{ row.label }}</option></datalist>
    <span v-if="error" :id="`${inputId}-error`" class="text-xs text-danger">{{ error }}</span>
  </label>
    <span v-if="category === 'HS_CODE' && company.hasPermission('fbr.configuration.view')" class="mt-1 flex flex-wrap items-center gap-2 text-xs">
      <button type="button" class="text-content-brand underline" :disabled="searching || modelValue.trim().length < 2" @click="search(1)">Search Local HS Catalogue</button>
      <button v-if="searchPage < lastPage" type="button" class="text-content-brand underline" :disabled="searching" @click="search(searchPage + 1)">Next results</button>
      <span v-if="searched.length" role="status">{{ searched.length }} result(s), page {{ searchPage }} of {{ lastPage }}.</span>
      <span v-if="searchError" role="alert">{{ searchError.message }}</span>
    </span>
    <ul v-if="category === 'HS_CODE' && searched.length" class="mt-1 max-h-40 overflow-y-auto rounded-md border border-line text-xs">
      <li v-for="row in searched" :key="row.id"><button type="button" class="w-full px-2 py-1 text-left hover:bg-surface-hover" @click="$emit('update:modelValue', row.code)">{{ row.code }} — {{ row.label }}</button></li>
    </ul>
</template>
