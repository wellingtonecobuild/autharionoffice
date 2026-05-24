import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle SPA redirect from static-host 404 fallback
const redirectPath = sessionStorage.getItem("__spa_redirect__");
if (redirectPath) {
  sessionStorage.removeItem("__spa_redirect__");
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")!).render(<App />);

