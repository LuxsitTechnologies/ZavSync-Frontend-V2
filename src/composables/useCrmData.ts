import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCompanyStore } from '@/stores/company'
import { useAsyncData } from '@/composables/useAsyncData'
import { crmRepository } from '@/services/crm/repository'
export function useCrmData(){
 const company=useCompanyStore(); const {activeCompanyId}=storeToRefs(company)
 const companies=useAsyncData(()=>crmRepository.companies(activeCompanyId.value),{watch:[activeCompanyId],isEmpty:r=>r.length===0})
 const contacts=useAsyncData(()=>crmRepository.contacts(activeCompanyId.value),{watch:[activeCompanyId],isEmpty:r=>r.length===0})
 const leads=useAsyncData(()=>crmRepository.leads(activeCompanyId.value),{watch:[activeCompanyId],isEmpty:r=>r.length===0})
 const activities=useAsyncData(()=>crmRepository.activities(activeCompanyId.value),{watch:[activeCompanyId],isEmpty:r=>r.length===0})
 const tasks=useAsyncData(()=>crmRepository.tasks(activeCompanyId.value),{watch:[activeCompanyId],isEmpty:r=>r.length===0})
 const emails=useAsyncData(()=>crmRepository.emails(activeCompanyId.value),{watch:[activeCompanyId]})
 const sequences=useAsyncData(()=>crmRepository.sequences(activeCompanyId.value),{watch:[activeCompanyId]})
 const integrations=useAsyncData(()=>crmRepository.integrations(activeCompanyId.value),{watch:[activeCompanyId]})
 const loading=computed(()=>companies.loading.value||contacts.loading.value||leads.loading.value)
 return {activeCompanyId,companies,contacts,leads,activities,tasks,emails,sequences,integrations,loading}
}
