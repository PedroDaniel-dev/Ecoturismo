// Cliente simples para o backend Spring Boot (proxy /api -> localhost:8080 no Vite).
const BASE = import.meta.env.VITE_API_URL || '/api';

// Em erro, lança Error com .status e, quando o backend explica o motivo ({ erro: "..." }), a mensagem dele.
export async function api(path, { method = 'GET', body, token } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { message = (await res.json()).erro || message; } catch (e) { /* corpo vazio ou não JSON */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
