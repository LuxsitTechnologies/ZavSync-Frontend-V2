<script setup lang="ts">
import {computed,ref} from "vue";
import {Bell,CheckCheck} from "lucide-vue-next";
import {useRouter} from "vue-router";
import {useAsyncData} from "@/composables/useAsyncData";
import {platformRepository} from "@/services/platform/repository";
import {useCompanyStore} from "@/stores/company";

const company=useCompanyStore(),router=useRouter(),open=ref(false);
const state=useAsyncData(()=>platformRepository.notifications(company.activeCompanyId),{watch:[()=>company.activeCompanyId]});
const rows=computed(()=>state.data.value?.notifications.data??[]),unread=computed(()=>state.data.value?.unread_count??0);
async function markAll(){await platformRepository.readAllNotifications(company.activeCompanyId);await state.refresh()}
async function select(id:string,url:string|null){await platformRepository.readNotification(company.activeCompanyId,id);open.value=false;await state.refresh();if(url?.startsWith('/')&&!url.startsWith('//'))await router.push(url)}
</script>
<template>
  <div class="relative">
    <button type="button" class="relative grid size-8 place-items-center rounded-md text-content-secondary hover:bg-surface-hover" aria-label="Notifications" @click="open=!open">
      <Bell class="size-4"/><span v-if="unread" class="absolute top-1 right-1 min-w-3.5 rounded-full bg-danger px-1 text-center text-[9px] leading-3.5 text-white">{{unread>9?'9+':unread}}</span>
    </button>
    <div v-if="open" class="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-md border border-line bg-surface shadow-lg sm:w-96">
      <div class="flex items-center justify-between border-b border-line px-4 py-3"><div><p class="text-sm font-semibold text-content">Notifications</p><p class="text-2xs text-content-muted">{{unread}} unread</p></div><button type="button" class="inline-flex items-center gap-1 text-xs text-content-brand" @click="markAll"><CheckCheck class="size-3.5"/>Mark all read</button></div>
      <div class="max-h-96 overflow-y-auto">
        <p v-if="state.loading.value" class="p-5 text-center text-xs text-content-muted">Loading notifications…</p>
        <p v-else-if="state.error.value" class="p-5 text-center text-xs text-danger">{{state.error.value.message}}</p>
        <p v-else-if="!rows.length" class="p-5 text-center text-xs text-content-muted">No notifications.</p>
        <button v-for="item in rows" :key="item.id" type="button" class="block w-full border-b border-line px-4 py-3 text-left hover:bg-surface-hover" :class="item.read_at?'':'bg-primary-subtle/30'" @click="select(item.id,item.related_url)">
          <p class="text-xs font-semibold text-content">{{item.title}}</p><p class="mt-1 text-xs text-content-secondary">{{item.message}}</p><p class="mt-1 text-2xs text-content-muted">{{new Date(item.created_at).toLocaleString()}}</p>
        </button>
      </div>
    </div>
  </div>
</template>
