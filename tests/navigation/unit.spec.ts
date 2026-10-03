import { test, expect } from "@playwright/test";
import { navigationForModules, presentationKeyForRoute, moduleForPath, permissionForPath } from "../../src/lib/nav";
import { visibilityLabel, type EffectiveNavigation } from "../../src/types/navigation";
import { createPinia, setActivePinia } from "pinia";
const nav = (keys: string[]): EffectiveNavigation => ({ catalog: [], items: [], visible_keys: keys });
const paths = (keys: string[]) => JSON.stringify(navigationForModules(['invoicing'], false, ['*'], nav(keys)));
test('navigation unit: override labels preserve all three states', () => {
  expect(visibilityLabel(null)).toBe('Default (inherited)');
  expect(visibilityLabel(true)).toBe('Visible (explicit show)');
  expect(visibilityLabel(false)).toBe('Hidden (explicit hide)');
});
test('navigation unit: independent keys and effective authority even for platform admin', () => {
  expect(paths(['accounting.invoices', 'fbr.invoicing'])).toContain('"to":"/fbr-invoicing"');
  expect(paths(['accounting.invoices'])).not.toContain('"to":"/fbr-invoicing"');
  expect(paths(['fbr.invoicing'])).not.toContain('"to":"/accounting/invoices"');
  expect(JSON.stringify(navigationForModules(['invoicing'], true, ['*'], nav([])))).not.toContain('"to":"/fbr-invoicing"');
  expect(moduleForPath('/fbr-invoicing')).toBe('invoicing');
  expect(permissionForPath('/fbr-invoicing')).toBe('pakistan_fbr.view');
});
test('navigation unit: all mapped modules retain backend-default visible items', () => {
  const result = JSON.stringify(navigationForModules(['invoicing','accounting','receivables','payables','inventory','procurement','banking','budgeting','payroll','crm','outreach','ai'], false, ['*'], nav(Object.values(presentationKeyForRoute))));
  for (const route of Object.keys(presentationKeyForRoute)) expect(result).toContain(`"to":"${route}"`);
  expect(result).toContain('Dashboard');
  expect(presentationKeyForRoute['/hrm/leave']).toBe('hrm.leave');
  expect(Object.values(presentationKeyForRoute)).toHaveLength(56);
});
test('navigation unit: switching hides old state and rejects stale updates', async () => {
  const { createServer } = await import("vite");
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const { useCompanyStore } = await server.ssrLoadModule("/src/stores/company.ts");
  const { authRepository } = await server.ssrLoadModule("/src/services/auth.repository.ts");
  setActivePinia(createPinia()); const store = useCompanyStore();
  const original = authRepository.switchCompany;
  const a = {id:'A',name:'A',currency:'PKR',timezone:'UTC',roles:['manager'],modules:['invoicing'],permissions:['*'],effective_navigation:nav(['accounting.invoices'])};
  const b = {...a,id:'B',roles:['viewer'],permissions:['pakistan_fbr.view'],effective_navigation:nav(['fbr.invoicing'])};
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {getItem:()=>null,setItem:()=>{},removeItem:()=>{}} });
  store.hydrate({user:{id:1,name:'Test',email:'test@example.invalid',is_platform_admin:false},companies:[a,b]});
  const version=store.contextVersion;
  let finish!: (value: {company: typeof b}) => void;
  authRepository.switchCompany = () => new Promise(resolve => {finish=resolve;});
  try {
    const switching=store.setCompany('B'); expect(store.effectiveNavigation?.visible_keys).toEqual([]);
    finish({company:b}); await switching;
    expect(store.effectiveNavigation?.visible_keys).toEqual(['fbr.invoicing']);
    store.updateNavigation('A',version,nav([]));
    expect(store.effectiveNavigation?.visible_keys).toEqual(['fbr.invoicing']);
    expect(store.activePermissions).toEqual(['pakistan_fbr.view']);
  } finally {authRepository.switchCompany=original;await server.close();if(storage)Object.defineProperty(globalThis,"localStorage",storage);else Reflect.deleteProperty(globalThis,"localStorage");}
});
