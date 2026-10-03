<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useWorkContext } from '@/composables/useWorkContext';
import { useCompanyStore } from '@/stores/company';
import { portalFinalRepository } from '@/services/portalFinal.repository';
import type { PortalRecord } from '@/types/portalFinal';
import Panel from '@/components/zs/Panel.vue';
import type { Holiday, LeaveRequest } from '@/types/leave';
const props = defineProps<{ holidays: Holiday[]; requests: LeaveRequest[]; initialMonth: string }>();
const month = ref(props.initialMonth || new Date().toISOString().slice(0, 7));
const company=useCompanyStore(),schedule=ref<PortalRecord[]|null>(null);
const scheduleAllowed=computed(()=>company.hasModule('payroll')&&company.hasPermission('employee.schedule.view'));
const context=useWorkContext(()=>{schedule.value=null;},loadSchedule);
function loadSchedule(){
  schedule.value=null;
  if(!scheduleAllowed.value||!/^\d{4}-\d{2}$/.test(month.value))return;
  const [year,value]=month.value.split('-').map(Number);
  const last=new Date(Date.UTC(year!,value!,0)).getUTCDate();
  void context.run('schedule',(id,signal)=>portalFinalRepository('schedule').list(id,{from_date:month.value+'-01',to_date:month.value+'-'+last},signal),v=>{schedule.value=v.data;});
}
watch(month,loadSchedule,{immediate:true,flush:'sync'});
const cells = computed(() => {
  const [year, value] = month.value.split('-').map(Number);
  if (!year || !value) return [];
  const count = new Date(Date.UTC(year, value, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, value - 1, 1)).getUTCDay();
  return [...Array.from({ length: offset }, () => null), ...Array.from({ length: count }, (_, i) => {
    const date = `${month.value}-${String(i + 1).padStart(2, '0')}`;
    return { date, day: i + 1, schedule: (schedule.value??[]).filter(item=>item.shift_date===date), holidays: props.holidays.filter(item => item.date === date), leaves: props.requests.filter(item => ['APPROVED', 'CANCELLATION_PENDING'].includes(item.status) && item.start_date <= date && item.end_date >= date) };
  })];
});
</script>
<template>
  <Panel title="Calendar" description="Source-labelled approved leave, fixed holidays and published schedule">
    <div class="space-y-3 p-4">
      <label class="block text-sm">Month<input v-model="month" type="month" class="field mt-1 max-w-xs" /></label>
      <p class="text-xs text-content-muted">Empty dates have no recorded event in these sources. No attendance, weekend or absence classification is inferred.</p>
      <p v-if="context.busy.schedule" role="status">Loading published schedule…</p><p v-if="context.errors.schedule" role="alert">{{ context.errors.schedule.message }} <button class="underline" @click="loadSchedule">Retry schedule</button></p>
      <div class="overflow-x-auto"><div class="min-w-[560px]">
        <div class="grid grid-cols-7 gap-1 text-center text-xs"><span v-for="day in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="day">{{ day }}</span></div>
        <div class="mt-2 grid grid-cols-7 gap-1"><div v-for="(cell, index) in cells" :key="index" class="min-h-24 rounded-md border p-1 text-xs" :class="cell ? 'border-line' : 'border-transparent'"><template v-if="cell"><p>{{ cell.day }}</p><p v-for="holiday in cell.holidays" :key="holiday.id" class="mt-1 break-words rounded bg-info/10 p-1">Company holiday: {{ holiday.name }}</p><p v-for="leave in cell.leaves" :key="leave.id" class="mt-1 break-words rounded bg-warning/10 p-1">Approved leave: {{ leave.type_name }}{{ leave.status === 'CANCELLATION_PENDING' ? ' (cancellation pending)' : '' }} · {{ leave.day_portion.replaceAll('_', ' ') }}</p><p v-for="assignment in cell.schedule" :key="assignment.id" class="mt-1 break-words rounded bg-primary-subtle p-1">Published schedule: {{ assignment.shift_name }} · {{ assignment.start_time }}–{{ assignment.end_time }} · {{ assignment.timezone }}</p></template></div></div>
      </div></div>
    </div>
  </Panel>
</template>
