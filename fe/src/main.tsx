import "./app/polyfills";

import React from "react";
import ReactDOM from "react-dom/client";
import AppMain from "./app/main";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppMain />  
  </React.StrictMode>
);
