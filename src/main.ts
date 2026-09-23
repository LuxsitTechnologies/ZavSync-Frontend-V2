import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";
import "./styles/zavsync.css";
import { authRepository } from "./services/auth.repository";
import { isApiConfigured } from "./services/api/client";
import { useCompanyStore } from "./stores/company";

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App).use(pinia).use(router);
  if (isApiConfigured()) {
    try {
      useCompanyStore(pinia).hydrate(await authRepository.me());
    } catch {
      if (window.location.pathname !== "/login") await router.push("/login");
    }
  }
  app.mount("#app");
}

void bootstrap();
