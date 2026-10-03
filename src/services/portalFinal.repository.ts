import { apiRequest, apiDownload } from '@/services/api/client';
import type { PortalDomain, PortalList, PortalDetail } from '@/types/portalFinal';
const selfRoots: Partial<Record<PortalDomain,string>> = {
  documents:'/employee/documents',announcements:'/employee/announcements',directory:'/employee/directory',
  teams:'/employee/my-teams','direct-reports':'/employee/direct-reports',contacts:'/employee/emergency-contacts',
  schedule:'/employee/schedule',swaps:'/employee/shift-swaps',assets:'/employee/asset-requests',
  expenses:'/employee/expense-claims',categories:'/employee/expense-categories',
};
const adminRoots: Partial<Record<PortalDomain,string>> = {
  documents:'/hrm/employee-documents',announcements:'/hrm/announcements',teams:'/hrm/teams',
  swaps:'/hrm/shift-swaps',assets:'/hrm/asset-requests',expenses:'/hrm/expense-claims',
  categories:'/hrm/expense-categories',shifts:'/hrm/shifts',rotas:'/hrm/rotas',
};
export type PortalCommand = 'create'|'edit'|'remove'|'release'|'publish'|'attachment'|'receipt'|'submit'|'approve'|'reject'|'accept'|'decline'|'active'|'members'|'remove-member'|'lead'|'slots'|'assignment';
/** Explicit domain roots; self screens cannot fall through to administrative APIs. */
export function portalFinalRepository(domain: PortalDomain, admin = false) {
  const root = (admin ? adminRoots : selfRoots)[domain];
  if (!root) throw new Error('Unsupported portal authority');
  const item = (id: string) => `${root}/${encodeURIComponent(id)}`;
  return {
    list: (companyId: string, query: Record<string,string|number>, signal: AbortSignal) => apiRequest<PortalList>(root,{companyId,query,signal}),
    detail: (companyId: string, id: string, page: number, signal: AbortSignal) => apiRequest<PortalDetail>(item(id),{companyId,query:{page},signal}),
    mutate: (companyId: string, command: PortalCommand, id: string, body: Record<string,unknown>|FormData, key: string|undefined, signal: AbortSignal, childId = '') => {
      let path = command === 'create' ? root : item(id);
      let method: 'POST'|'PATCH'|'DELETE' = 'POST';
      if (command === 'edit') method = 'PATCH';
      else if (command === 'remove') method = 'DELETE';
      else if (command === 'remove-member') { method = 'DELETE'; path += `/members/${encodeURIComponent(childId)}`; }
      else if (command === 'assignment') {
        if (!admin || domain !== 'rotas') throw new Error('Unsupported assignment authority');
        path = `/hrm/rota-slots/${encodeURIComponent(childId)}/assignments`;
      } else if (command !== 'create') { path += `/${command}`; if (command === 'lead' || command === 'active') method = 'PATCH'; }
      return apiRequest<PortalDetail>(path,{companyId,method,body,idempotencyKey:key,signal});
    },
    download: (companyId: string, id: string, filename: string, signal: AbortSignal) => {
      const suffix = domain === 'documents' ? 'download' : domain === 'announcements' ? 'attachment' : domain === 'expenses' ? 'receipt' : null;
      if (!suffix) throw new Error('This domain has no file authority');
      return apiDownload(`${item(id)}/${suffix}`,companyId,filename,signal);
    },
  };
}
