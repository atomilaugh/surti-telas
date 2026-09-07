import React from "react";
import ReactDOM from "react-dom/client";
import App from "./presentation/pages/App";
import "./index.css";
import "./styles/variables.css";
import "./styles/design-system.css";
import "./presentation/pages/styles/App.css";

import { AppProviders } from "@/app/providers/AppProviders";

import faviconUrl from "./assets/images/logos/partner-logo-2-Photoroom.png";

const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
if (favicon) {
  favicon.href = faviconUrl;
  favicon.type = "image/png";
} else {
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = faviconUrl;
  document.head.appendChild(link);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  });
}

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);