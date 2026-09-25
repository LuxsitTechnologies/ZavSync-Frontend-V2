import { storeToRefs } from "pinia";
import { useAsyncData } from "@/composables/useAsyncData";
import { outreachRepository } from "@/services/outreach/repository";
import { useCompanyStore } from "@/stores/company";

export function useOutreachData(){
  const company=useCompanyStore();const {activeCompanyId}=storeToRefs(company);const watch=[activeCompanyId];
  const connections=useAsyncData(()=>outreachRepository.connections(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const identities=useAsyncData(()=>outreachRepository.identities(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const templates=useAsyncData(()=>outreachRepository.templates(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const sequences=useAsyncData(()=>outreachRepository.sequences(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const enrollments=useAsyncData(()=>outreachRepository.enrollments(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const messages=useAsyncData(()=>outreachRepository.messages(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const suppressions=useAsyncData(()=>outreachRepository.suppressions(activeCompanyId.value),{watch,isEmpty:rows=>rows.length===0});
  const report=useAsyncData(()=>outreachRepository.report(activeCompanyId.value),{watch});
  const refresh=()=>Promise.all([connections.refresh(),identities.refresh(),templates.refresh(),sequences.refresh(),enrollments.refresh(),messages.refresh(),suppressions.refresh(),report.refresh()]);
  return{activeCompanyId,connections,identities,templates,sequences,enrollments,messages,suppressions,report,refresh};
}
