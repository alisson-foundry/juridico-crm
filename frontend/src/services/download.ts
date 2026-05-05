import api from './api';

/**
 * Downloads a file from an authenticated API endpoint.
 * Uses axios (which sends the Bearer token) and triggers a browser download
 * via a temporary blob URL — avoids the "Token não fornecido" error that
 * happens when the browser opens the URL directly without headers.
 */
export async function downloadFile(path: string, fallbackName = 'arquivo') {
  const response = await api.get(path, { responseType: 'blob' });

  // Try to extract filename from Content-Disposition header
  const disposition = response.headers['content-disposition'] ?? '';
  const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
  const filename = match ? decodeURIComponent(match[2]) : fallbackName;

  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
