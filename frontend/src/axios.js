import axios from "axios";

const api = axios.create({
  baseURL: "/api/",   // Because Vite proxy will handle the localhost:8000 part
  timeout: 5000,
});

export default api;
