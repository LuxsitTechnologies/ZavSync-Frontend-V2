<script setup lang="ts">
import UserAvatar from "./UserAvatar.vue";
import { formatMoneyCompact } from "@/lib/money";
import type { CrmDeal, CrmPipelineStage } from "@/types/crm";

defineProps<{ deals: CrmDeal[]; stages: CrmPipelineStage[] }>();
const emit = defineEmits<{ move: [id: string, stageId: string]; open: [id: string] }>();
function drop(event: DragEvent, stageId: string) {
  const id = event.dataTransfer?.getData("text/plain");
  if (id) emit("move", id, stageId);
}
</script>

<template>
  <div class="overflow-x-auto pb-2">
    <div class="grid min-w-[1100px] gap-3" :style="{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(210px, 1fr))` }">
      <section v-for="stage in stages" :key="stage.id" class="rounded-md bg-surface-sunken p-2" @dragover.prevent @drop="drop($event, stage.id)">
        <header class="mb-2 flex items-center justify-between px-1"><span class="label-caps">{{ stage.name }}</span><span class="num text-2xs text-content-muted">{{ deals.filter((deal) => deal.pipelineStageId === stage.id).length }}</span></header>
        <div class="space-y-2">
          <article v-for="deal in deals.filter((item) => item.pipelineStageId === stage.id)" :key="deal.id" draggable="true" class="cursor-grab rounded-md border border-line bg-surface p-3 shadow-xs active:cursor-grabbing" @dragstart="$event.dataTransfer?.setData('text/plain', deal.id)" @click="$emit('open', deal.id)">
            <p class="text-xs font-semibold text-content">{{ deal.company }}</p><p class="mt-0.5 text-2xs text-content-muted">{{ deal.name }}</p>
            <p class="num mt-3 text-sm font-semibold text-content">{{ formatMoneyCompact(deal.value, deal.currency) }}</p>
            <div class="mt-3 flex items-center gap-2"><UserAvatar :name="deal.owner || 'Unassigned'" size="sm"/><span class="truncate text-2xs text-content-muted">{{ deal.owner || 'Unassigned' }}</span></div>
            <p class="mt-2 text-2xs text-content-muted">{{ deal.probability }}% probability</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
