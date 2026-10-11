import { expect, test } from '@playwright/test';
import { customerPhoneError } from '../../src/lib/customerPhone';

test('customer phone follows 7–15 digits and permits common separators without restricting names', () => {
  for (const value of ['', '+92 (300) 123-4567', '1234567', '123.456.7890']) expect(customerPhoneError(value)).toBeNull();
  for (const value of ['123456', '1234567890123456', 'Ayesha 1234567', '123/456/7890']) expect(customerPhoneError(value)).not.toBeNull();
});

test('invitation role lookup uses its own company-scoped endpoint while role administration stays separate', async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const oldFetch = globalThis.fetch, oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const calls: Array<{ path: string; company: string | undefined }> = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'http://portal.invalid' } } });
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push({ path, company: (init?.headers as Record<string, string>)['X-Company-Id'] });
    return new Response(JSON.stringify(path.endsWith('/assignable-roles') ? { roles: [{ id: 7, name: 'Eligible role' }] } : { roles: [], permissions: [] }));
  };
  try {
    const { platformRepository } = await server.ssrLoadModule('/src/services/platform/repository.ts');
    expect(await platformRepository.assignableInvitationRoles('company-A')).toEqual({ roles: [{ id: 7, name: 'Eligible role' }] });
    await platformRepository.roles('company-A');
    expect(calls).toEqual([
      { path: '/api/v1/platform/invitations/assignable-roles', company: 'company-A' },
      { path: '/api/v1/platform/roles', company: 'company-A' },
    ]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    await server.close();
  }
});
