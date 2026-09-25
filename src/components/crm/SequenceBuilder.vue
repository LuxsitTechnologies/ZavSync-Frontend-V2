<script setup lang="ts">
import { Clock, Mail, Plus, Trash2 } from "lucide-vue-next";
import ZButton from "@/components/zs/ZButton.vue";
import type { OutreachStep } from "@/types/outreach";

const props=defineProps<{modelValue:OutreachStep[];locked?:boolean}>();
const emit=defineEmits<{"update:modelValue":[steps:OutreachStep[]]}>();
function patch(index:number,key:keyof OutreachStep,value:string|number|null){emit("update:modelValue",props.modelValue.map((step,i)=>i===index?{...step,[key]:value}:step))}
function addEmail(){emit("update:modelValue",[...props.modelValue,{type:"EMAIL",template_id:null,subject:"",body_text:"",body_html:null,wait_minutes:0}])}
function addWait(){emit("update:modelValue",[...props.modelValue,{type:"WAIT",wait_minutes:1440}])}
function remove(index:number){emit("update:modelValue",props.modelValue.filter((_,i)=>i!==index))}
</script>

<template>
  <div class="space-y-3">
    <article v-for="(step,index) in modelValue" :key="step.id??index" class="panel p-4">
      <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2"><span class="grid size-8 place-items-center rounded-md bg-primary-subtle text-primary"><Mail v-if="step.type==='EMAIL'" class="size-4"/><Clock v-else class="size-4"/></span><p class="text-sm font-semibold text-content">{{step.type==='EMAIL'?`Email ${index+1}`:`Wait ${index+1}`}}</p></div><ZButton v-if="!locked" variant="ghost" aria-label="Delete step" @click="remove(index)"><Trash2 class="size-3.5"/></ZButton></div>
      <template v-if="step.type==='EMAIL'"><label class="mt-3 block"><span class="label-caps">Subject</span><input class="field mt-1.5" :value="step.subject??''" :disabled="locked" @input="patch(index,'subject',($event.target as HTMLInputElement).value)"/></label><label class="mt-3 block"><span class="label-caps">Email body</span><textarea class="field mt-1.5 min-h-36" :value="step.body_text??''" :disabled="locked" @input="patch(index,'body_text',($event.target as HTMLTextAreaElement).value)"></textarea></label></template>
      <label v-else class="mt-3 block"><span class="label-caps">Delay in minutes</span><input class="field mt-1.5" type="number" min="1" max="525600" :value="step.wait_minutes" :disabled="locked" @input="patch(index,'wait_minutes',Number(($event.target as HTMLInputElement).value))"/><span class="mt-1 block text-2xs text-content-muted">1 day = 1,440 minutes. The backend advances to the next eligible weekday and sending window.</span></label>
    </article>
    <div v-if="!locked" class="flex gap-2"><ZButton variant="outline" @click="addEmail"><Plus class="size-3.5"/>Add email</ZButton><ZButton variant="outline" @click="addWait"><Clock class="size-3.5"/>Add wait</ZButton></div>
  </div>
</template>
