import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getAdminToken } from "./hooks/use-admin-auth";
import App from "./App";
import "./index.css";

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

setAuthTokenGetter(getAdminToken);

createRoot(document.getElementById("root")!).render(<App />);
