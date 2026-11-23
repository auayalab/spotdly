// Compartir genérico: usa el menú nativo del teléfono (cualquier app)
// y, si el navegador no lo soporta (p. ej. escritorio), copia al portapapeles.

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para navegadores sin Clipboard API o sin HTTPS
    try {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      input.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Devuelve 'shared' | 'copied' | 'cancelled' | 'failed'.
 * Sin menú nativo, copia `text` + `url` al portapapeles.
 */
export async function shareOrCopy({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // algunos navegadores lanzan error si no pueden compartir: caemos a copiar
    }
  }
  const ok = await copyText([text, url].filter(Boolean).join(' '));
  return ok ? 'copied' : 'failed';
}
