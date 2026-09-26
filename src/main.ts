import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";
import "./styles/zavsync.css";
import { authRepository } from "./services/auth.repository";
import { useCompanyStore } from "./stores/company";

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App).use(pinia);
  const company = useCompanyStore(pinia);

  try {
    company.hydrate(await authRepository.me());
  } catch {
    company.clear();
  }

  app.use(router);
  window.addEventListener("zavsync:unauthenticated", () => {
    company.clear();
    if (!["/login", "/forgot-password", "/set-password", "/accept-invitation"].includes(router.currentRoute.value.path)) {
      void router.replace({ path: "/login", query: { redirect: router.currentRoute.value.fullPath } });
    }
  });
  await router.isReady();
  app.mount("#app");
}

void bootstrap();
