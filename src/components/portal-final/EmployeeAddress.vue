<script setup lang="ts">
import { computed, ref } from 'vue';
import Panel from '@/components/zs/Panel.vue';
import ZButton from '@/components/zs/ZButton.vue';
import { identityRepository } from '@/services/identity.repository';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import type { EmployeeSelf } from '@/types/identity';
const company=useCompanyStore(),profile=ref<EmployeeSelf|null>(null),address=ref(''),notice=ref('');
const context=useWorkContext(()=>{profile.value=null;address.value='';notice.value='';},load);
const writable=computed(()=>profile.value?.self_editable===true&&company.hasModule('payroll')&&company.hasPermission('employee.profile.edit')&&Number.isSafeInteger(profile.value.employee?.self_profile_version));
function load(){if(!company.hasPermission('employee.self.view'))return;profile.value=null;address.value='';void context.run('profile',(id,signal)=>identityRepository.employee(id,signal),v=>{profile.value=v;address.value=v.employee?.address??'';});}
function save(){if(!writable.value||context.busy.mutation)return;const version=profile.value!.employee!.self_profile_version!;const original=address.value;notice.value='';void context.run('mutation',(id,signal)=>identityRepository.saveAddress(id,original||null,version,signal),v=>{profile.value=v;address.value=v.employee?.address??'';notice.value='Address saved.';},()=>{notice.value='Update not confirmed. Reloaded the authoritative profile; review it before trying again.';load();});}
load();
</script>
<template><Panel title="Employee address" body-class="space-y-3 p-4"><p v-if="!company.hasPermission('employee.self.view')">Employee self-profile access is unavailable.</p><p v-if="context.busy.profile" role="status">Loading address…</p><p v-for="(error,key) in context.errors" v-show="error" :key="key" role="alert">{{ error?.message }}</p><ZButton v-if="context.errors.profile" variant="outline" @click="load">Retry address</ZButton><p v-if="profile&&!profile.linked">No employee profile linked.</p><form v-if="profile?.employee" class="space-y-3" @submit.prevent="save"><label for="self-address" class="block text-sm">Address</label><textarea id="self-address" v-model="address" class="field h-auto" rows="3" :readonly="!writable" :disabled="context.busy.mutation" /><p class="text-xs">Address is the only self-editable employee field. HR controls work contact details, employment fields, dates and status.</p><ZButton v-if="writable" type="submit" :disabled="context.busy.mutation">Save address</ZButton></form><p v-if="notice" role="status">{{ notice }}</p></Panel></template>
