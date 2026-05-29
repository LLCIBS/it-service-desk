export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  return res;
}

export function ticketFileUrl(ticketId: string, filename: string) {
  return `/api/tickets/${ticketId}/files/${encodeURIComponent(filename)}`;
}
