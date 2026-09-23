<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { CheckCircle2, Circle, Lock } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { planningRepository } from "@/services/accounting/planning.repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Year-End Closing", "Controlled validation, retained-earnings preview and fiscal-year close.");
const company=useCompanyStore(),step=ref(1),selectedYear=ref(""),confirmation=ref(""),reason=ref(""),dialog=ref(false);
const years=useAsyncData(async()=>{const rows=await planningRepository.fiscalYears(company.activeCompanyId);if(!selectedYear.value)selectedYear.value=rows[0]?.id??"";return rows;},{watch:[()=>company.activeCompanyId]});
const preview=useAsyncData(async()=>selectedYear.value?planningRepository.yearEndPreview(company.activeCompanyId,selectedYear.value):{fiscal_year_id:"",ready:false,checks:[],trial_balance:{debit:0,credit:0,balanced:true},net_profit:0,retained_earnings_account:null,closing_lines:[]},{watch:[()=>company.activeCompanyId,()=>selectedYear.value]});
const closeMutation=useMutation(planningRepository.closeFiscalYear),reopenMutation=useMutation(planningRepository.reopenFiscalYear);
const year=computed(()=>years.data.value?.find(x=>x.id===selectedYear.value));
const canClose=computed(()=>Boolean(year.value&&preview.data.value?.ready&&confirmation.value===`CLOSE ${year.value.name}`));
const revenueClose=computed(()=>preview.data.value?.closing_lines.filter(x=>x.debit>0).reduce((a,x)=>a+x.debit,0)??0);
const expenseClose=computed(()=>preview.data.value?.closing_lines.filter(x=>x.credit>0).reduce((a,x)=>a+x.credit,0)??0);
watch(selectedYear,()=>{step.value=1;confirmation.value="";});
async function close(){if(!year.value||!canClose.value)return;const result=await closeMutation.run(company.activeCompanyId,year.value.id,confirmation.value);if(result){dialog.value=false;step.value=4;showToast("Fiscal year closed","The closing journal and immutable close record were created.","success");await years.refresh();await preview.refresh();}}
async function reopen(){if(!year.value)return;const result=await reopenMutation.run(company.activeCompanyId,year.value.id,reason.value);if(result){showToast("Fiscal year reopened","The closing journal was reversed and the final period reopened.","success");reason.value="";step.value=1;await years.refresh();await preview.refresh();}}
</script>
<template><AppShell><PageHeader title="Year-End Closing" :description="year?`${year.name} · ${year.start_date} to ${year.end_date}`:'Select a fiscal year'"><template #actions><select v-model="selectedYear" class="field w-48"><option v-for="item in years.data.value??[]" :key="item.id" :value="item.id">{{item.name}}</option></select><span v-if="year" class="zs-badge" :class="year.status==='closed'?'badge-success':'badge-warning'">{{year.status}}</span></template></PageHeader>
<div class="mb-4 grid gap-2 sm:grid-cols-4"><button v-for="n in 4" :key="n" class="panel flex items-center gap-2 p-3 text-left" :class="step===n?'border-primary':''" @click="step=n"><CheckCircle2 v-if="n<step||year?.status==='closed'" class="size-4 text-success"/><Circle v-else class="size-4 text-content-muted"/><span class="text-xs font-medium">{{['Validate','Preview close','Confirm','Locked'][n-1]}}</span></button></div>
<AsyncSection :loading="preview.loading.value" :error="preview.error.value" :empty="false" @retry="preview.refresh">
<Panel v-if="step===1" title="Pre-close validation" description="Backend checks are rerun during close; blockers cannot be bypassed"><ul class="divide-y divide-line"><li v-for="check in preview.data.value?.checks??[]" :key="check.key" class="flex items-center justify-between gap-4 p-4 text-sm"><span><strong>{{check.label}}</strong><small class="mt-1 block text-content-secondary">{{check.message}}</small></span><span class="zs-badge" :class="check.passed?'badge-success':check.severity==='BLOCKER'?'badge-danger':'badge-warning'">{{check.passed?'Complete':check.severity}}</span></li></ul><div class="p-4"><ZButton :disabled="!preview.data.value?.ready" @click="step=2">Continue to preview</ZButton></div></Panel>
<Panel v-else-if="step===2" title="Closing journal preview" description="Temporary P&L balances move to the configured retained earnings account"><div class="grid gap-4 p-5 sm:grid-cols-3"><div><p class="label-caps">Close debits</p><p class="num mt-2 text-lg font-semibold">{{formatMoney(revenueClose)}}</p></div><div><p class="label-caps">Close credits</p><p class="num mt-2 text-lg font-semibold">{{formatMoney(expenseClose)}}</p></div><div><p class="label-caps">Net income / loss</p><p class="num mt-2 text-lg font-semibold" :class="(preview.data.value?.net_profit??0)>=0?'text-success':'text-danger'">{{formatMoney(preview.data.value?.net_profit??0)}}</p><small class="text-content-secondary">{{preview.data.value?.retained_earnings_account?.code}} · {{preview.data.value?.retained_earnings_account?.name}}</small></div></div><div class="border-t border-line p-4"><ZButton @click="step=3">Continue to confirmation</ZButton></div></Panel>
<Panel v-else-if="step===3" title="Final confirmation" description="This posts the controlled closing entry and closes the fiscal year"><div class="max-w-lg space-y-4 p-5"><p class="text-sm text-content-secondary">Type <strong>CLOSE {{year?.name}}</strong> to confirm.</p><input v-model="confirmation" class="field w-full" aria-label="Closing confirmation"/><ZButton :disabled="!canClose" @click="dialog=true"><Lock class="size-4"/>Close fiscal year</ZButton><ValidationMessage :message="closeMutation.error.value?.message??null"/></div></Panel>
<Panel v-else :title="`${year?.name??'Fiscal year'} closed`"><div class="p-10 text-center"><CheckCircle2 class="mx-auto size-10 text-success"/><p class="mt-4 text-lg font-semibold text-content">Financial year locked</p><p class="mt-2 text-sm text-content-secondary">The closing and audit records are preserved. Reopening requires an elevated permission and a reason.</p><div class="mx-auto mt-5 grid max-w-lg gap-2"><textarea v-model="reason" class="field min-h-20" placeholder="Approved reopen reason"/><ZButton variant="outline" :disabled="!reason.trim()" @click="reopen">Reopen with reversal</ZButton><ValidationMessage :message="reopenMutation.error.value?.message??null"/></div></div></Panel></AsyncSection>
<ConfirmDialog :open="dialog" :title="`Close ${year?.name}?`" message="This is a high-impact accounting operation. The backend will revalidate every close requirement before posting." confirm-label="Close fiscal year" tone="danger" :busy="closeMutation.saving.value" @cancel="dialog=false" @confirm="close"/></AppShell></template>
