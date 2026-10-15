import { test, expect } from "@playwright/test";
import { activeNavigationPath, navigation, navigationForModules, presentationKeyForRoute, moduleForPath, permissionForPath } from "../../src/lib/nav";
import { readFileSync } from "node:fs";
import { visibilityLabel, type EffectiveNavigation } from "../../src/types/navigation";
import { createPinia, setActivePinia } from "pinia";
const nav = (keys: string[]): EffectiveNavigation => ({ catalog: [], items: [], visible_keys: keys });
const paths = (keys: string[]) => JSON.stringify(navigationForModules(['invoicing'], false, ['*'], nav(keys)));
test('approved FBR name, Title Case HRM labels and distinct icons keep route identities', () => {
  const items = navigation.flatMap(group => group.items);
  const fbr = items.find(item => item.to === undefined && item.label === 'FBR Invoice');
  expect(fbr?.children?.map(item => item.label)).toEqual(['Invoice Register', 'Create Invoice', 'Portal Settings', 'Migration Administration']);
  expect(fbr?.children?.find(item => item.label === 'Migration Administration')?.permission).toBe('migration.view');
  expect(fbr?.children?.some(item => item.label === 'FBR Configuration')).toBe(false);
  const hrm = items.find(item => item.label === 'HRM');
  const children = hrm?.children ?? [];
  for (const label of ['Employee Documents', 'Shift Swaps', 'Equipment Requests', 'Expense Claims', 'Expense Categories']) expect(children.map(item => item.label)).toContain(label);
  expect(new Set(children.map(item => item.icon)).size).toBe(children.length);
  expect(presentationKeyForRoute['/hrm/employee-documents']).toBe('hrm.employee_documents');
});
test('detail routes keep the most specific navigation child active', () => {
  expect(activeNavigationPath('/accounting/invoices/invoice-1')).toBe('/accounting/invoices');
  expect(activeNavigationPath('/crm/companies/customer-1')).toBe('/crm/companies');
  expect(activeNavigationPath('/fbr-invoicing/invoice-1/edit')).toBe('/fbr-invoicing');
  expect(activeNavigationPath('/fbr-invoicing/configuration')).toBe('/fbr-invoicing');
  expect(activeNavigationPath('/fbr-invoicing/portal-settings')).toBe('/fbr-invoicing/portal-settings');
  expect(activeNavigationPath('/')).toBe('/');
});
test('public HTML contains approved social preview metadata before Vue starts', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('<title>ZavSync</title>');
  expect(html).toContain('content="Unified. Intelligent. Synchronized."');
  expect(html).toContain('property="og:title" content="ZavSync"');
  expect(html).toContain('name="twitter:title" content="ZavSync"');
  expect(html).not.toContain('ZavSync — Unified ERP');
});
test('Billing navigation requires dedicated billing view permission', () => {
  const authorized = JSON.stringify(navigationForModules([], false, ['billing.view']));
  const denied = JSON.stringify(navigationForModules([], false, []));
  expect(permissionForPath('/billing')).toBe('billing.view');
  expect(authorized).toContain('"to":"/billing"');
  expect(authorized).toContain('Billing & Subscription');
  expect(denied).not.toContain('"to":"/billing"');
});
test('Portal Settings is the normal FBR configuration destination with separate view authority', () => {
  const authorized = JSON.stringify(navigationForModules(['invoicing'], false, ['pakistan_fbr.view', 'portal.settings.view']));
  const denied = JSON.stringify(navigationForModules(['invoicing'], false, ['pakistan_fbr.view']));
  expect(permissionForPath('/fbr-invoicing/portal-settings')).toBe('portal.settings.view');
  expect(permissionForPath('/fbr-invoicing/configuration')).toBe('fbr.configuration.view');
  expect(authorized).toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(denied).not.toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(authorized).not.toContain('"to":"/fbr-invoicing/configuration"');
  expect(authorized).not.toContain('"to":"/fbr-invoicing/migrations"');
});
test('Portal Settings visibility is independent of the invoice register and never grants access', () => {
  expect(presentationKeyForRoute['/fbr-invoicing/portal-settings']).toBe('fbr.portal_settings');
  const portalOnly = JSON.stringify(navigationForModules(['invoicing'], false, ['portal.settings.view'], nav(['fbr.portal_settings'])));
  expect(portalOnly).toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(portalOnly).not.toContain('"to":"/fbr-invoicing"');
  const hidden = JSON.stringify(navigationForModules(['invoicing'], false, ['portal.settings.view'], nav(['fbr.invoicing'])));
  expect(hidden).not.toContain('"to":"/fbr-invoicing/portal-settings"');
  const denied = JSON.stringify(navigationForModules(['invoicing'], false, [], nav(['fbr.portal_settings'])));
  expect(denied).not.toContain('"to":"/fbr-invoicing/portal-settings"');
});
test('company ownership exposes only backend-authorized billing and Portal Settings destinations', () => {
  const owner = JSON.stringify(navigationForModules(['invoicing'], false, [], undefined, true));
  const ordinary = JSON.stringify(navigationForModules(['invoicing'], false, [], undefined, false));
  const ownerWithoutFbr = JSON.stringify(navigationForModules([], false, [], undefined, true));
  expect(owner).toContain('"to":"/billing"');
  expect(owner).toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(owner).not.toContain('"to":"/fbr-invoicing/migrations"');
  expect(ordinary).not.toContain('"to":"/billing"');
  expect(ordinary).not.toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(ownerWithoutFbr).not.toContain('"to":"/fbr-invoicing/portal-settings"');
});
test('Migration Administration requires migration viewing permission, not platform-admin status', () => {
  const viewer = JSON.stringify(navigationForModules(['invoicing'], false, ['migration.view'], nav(['fbr.migrations'])));
  const ordinary = JSON.stringify(navigationForModules(['invoicing'], false, ['pakistan_fbr.view'], nav(['fbr.migrations'])));
  expect(permissionForPath('/fbr-invoicing/migrations/run-1')).toBe('migration.view');
  expect(viewer).toContain('"to":"/fbr-invoicing/migrations"');
  expect(ordinary).not.toContain('"to":"/fbr-invoicing/migrations"');
});
test('approved login branding keeps native image proportions and tagline on both layouts', () => {
  const layout = readFileSync('src/components/zs/AuthLayout.vue', 'utf8');
  const logo = readFileSync('src/components/zs/Logo.vue', 'utf8');
  for (const asset of ['src/assets/zavsync-logo.png', 'src/assets/zavsync-logo-dark.png']) {
    const bytes = readFileSync(asset);
    expect(bytes.toString('ascii', 1, 4)).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(700);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(140);
  }
  expect(layout.match(/Unified\. Intelligent\. Synchronized\./g)).toHaveLength(2);
  expect(logo).toContain('w-auto');
  expect(layout).toContain('object-contain');
});
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
  expect(presentationKeyForRoute['/accounting/fbr']).toBe('accounting.fbr_status');
  expect(paths(['accounting.invoices'])).not.toContain('"to":"/accounting/fbr"');
  expect(paths(['accounting.fbr_status'])).toContain('"to":"/accounting/fbr"');
});
test('backend parent visibility controls presentation without granting child authority', () => {
  const effective: EffectiveNavigation = {
    ...nav(['accounting.invoices', 'accounting.fbr_status']),
    parents: [{key:'finance.accounting',label:'Accounting',child_keys:['accounting.invoices','accounting.fbr_status'],visible_child_keys:[],effective_visible:false}],
  };
  const hidden = JSON.stringify(navigationForModules(['invoicing'], false, ['*'], effective));
  expect(hidden).not.toContain('"label":"Accounting"');
  effective.parents![0].effective_visible = true;
  const shown = JSON.stringify(navigationForModules(['invoicing'], false, ['accounting.view'], effective));
  expect(shown).toContain('"to":"/accounting/fbr"');
});
test('navigation unit: customer entries follow effective module visibility while legacy FBR configuration stays routable', () => {
  const result = JSON.stringify(navigationForModules(['invoicing','accounting','receivables','payables','inventory','procurement','banking','budgeting','payroll','crm','outreach','ai'], false, ['*'], nav(Object.values(presentationKeyForRoute))));
  for (const route of Object.keys(presentationKeyForRoute).filter(route => route !== '/fbr-invoicing/configuration')) expect(result).toContain(`"to":"${route}"`);
  expect(result).not.toContain('"to":"/fbr-invoicing/configuration"');
  expect(result).toContain('"to":"/fbr-invoicing/migrations"');
  expect(result).toContain('"to":"/fbr-invoicing/portal-settings"');
  expect(result).toContain('Dashboard');
  expect(presentationKeyForRoute['/hrm/leave']).toBe('hrm.leave');
  expect(Object.values(presentationKeyForRoute)).toHaveLength(68);
});
test('withheld modules stay absent for a new managed company even when visibility suggests otherwise', () => {
  const effective = nav(['procurement.purchases', 'outreach.providers', 'fbr.invoicing']);
  const result = JSON.stringify(navigationForModules(['invoicing', 'payroll'], false, ['*'], effective));
  expect(result).not.toContain('"to":"/purchases"');
  expect(result).not.toContain('"to":"/outreach/integrations"');
  expect(result).toContain('"to":"/fbr-invoicing"');
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
    store.hydrate({user:{id:1,name:'Company Admin',email:'admin@example.invalid',is_platform_admin:false,platform_permissions:['platform.jobs.view']},companies:[b]});
    expect(store.hasPermission('platform.jobs.view')).toBe(false);
    store.hydrate({user:{id:1,name:'ZavSync Admin',email:'platform@example.invalid',is_platform_admin:true,platform_permissions:['platform.jobs.view']},companies:[b]});
    expect(store.hasPermission('platform.jobs.view')).toBe(true);
    expect(store.activePermissions).toEqual(['pakistan_fbr.view']);
  } finally {authRepository.switchCompany=original;await server.close();if(storage)Object.defineProperty(globalThis,"localStorage",storage);else Reflect.deleteProperty(globalThis,"localStorage");}
});
