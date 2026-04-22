import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
 
 // Filter out noisy chrome-extension errors that aren't related to the app
 window.addEventListener('error', (e) => {
   if (e.message?.includes("Unexpected token 'export'") && (e.filename?.includes('chrome-extension') || !e.filename)) {
     e.stopImmediatePropagation();
   }
 }, true);
 
 window.addEventListener('unhandledrejection', (e) => {
   if (e.reason?.message?.includes("Unexpected token 'export'")) {
     e.stopImmediatePropagation();
   }
 }, true);

createRoot(document.getElementById("root")!).render(<App />);
