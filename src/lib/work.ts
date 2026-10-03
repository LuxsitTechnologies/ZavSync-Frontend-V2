import type { WorkAction, WorkKind } from '@/types/work';
export const workStatuses = { tasks: ['ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'], tickets: ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'] };
export function workActions(kind: WorkKind, status: string, admin: boolean): WorkAction[] {
  if (kind === 'tasks') {
    if (status === 'ASSIGNED') return admin ? ['start','cancel'] : ['start'];
    if (status === 'IN_PROGRESS') return admin ? ['complete','cancel'] : ['complete'];
    return status === 'COMPLETED' && admin ? ['reopen'] : [];
  }
  if (status === 'OPEN') return admin ? ['start','close'] : ['close'];
  if (status === 'IN_PROGRESS') return admin ? ['resolve','close'] : ['close'];
  if (status === 'RESOLVED') return admin ? ['close','reopen'] : ['close'];
  return status === 'CLOSED' && admin ? ['reopen'] : [];
}
export const workWritable = (kind: WorkKind, status: string) => (kind === 'tasks' ? ['ASSIGNED','IN_PROGRESS'] : ['OPEN','IN_PROGRESS','RESOLVED']).includes(status);
