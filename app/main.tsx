import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import { TrendExplorer } from "./trend-explorer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TrendExplorer />
  </StrictMode>,
);
