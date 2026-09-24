<script setup lang="ts">
import { Mail,Phone,StickyNote,CheckSquare,Calendar } from "lucide-vue-next";
import ZButton from "@/components/zs/ZButton.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import type { CrmActivity } from "@/types/crm";
withDefaults(defineProps<{ items: CrmActivity[]; actions?: boolean }>(), { actions: false });
defineEmits<{ edit: [activity: CrmActivity]; transition: [activity: CrmActivity] }>();
const icons = { Email:Mail, Call:Phone, Note:StickyNote, Task:CheckSquare, Meeting:Calendar };
</script>
<template><ol class="divide-y divide-line"><li v-for="item in items" :key="item.id" class="flex gap-3 py-3 first:pt-0 last:pb-0"><span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-surface-sunken text-content-secondary"><component :is="icons[item.type]" class="size-3.5"/></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center justify-between gap-1"><p class="text-sm font-medium text-content">{{item.title}}</p><time class="num text-2xs text-content-muted">{{item.timestamp}}</time></div><p class="mt-0.5 text-xs text-content-secondary">{{item.detail}}</p><p class="mt-1 text-2xs text-content-muted">{{item.related?.name||'General'}} · {{item.owner||item.actor||'Unassigned'}}</p><div v-if="actions" class="mt-2 flex items-center gap-2"><StatusBadge :status="item.status"/><ZButton variant="ghost" @click="$emit('edit',item)">Edit</ZButton><ZButton variant="ghost" @click="$emit('transition',item)">{{item.status==='COMPLETED'?'Reopen':'Complete'}}</ZButton></div></div></li></ol></template>
