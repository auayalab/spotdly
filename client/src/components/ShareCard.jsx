import { useState } from 'react';
import { Button, Card, CardTitle } from './ui.jsx';
import { copyText, shareOrCopy } from '../lib/share.js';

// Enlace del plan: funciona en cualquier app o navegador, no depende de una red social.
export default function ShareCard({ room, compact = false }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/p/${room.id}`;

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function copy() {
    if (await copyText(url)) flashCopied();
  }

  async function share() {
    const result = await shareOrCopy({
      title: room.title,
      text: `Vota qué hacemos en "${room.title}"`,
      url,
    });
    if (result === 'copied') flashCopied();
  }

  return (
    <Card compact={compact}>
      {!compact && (
        <>
          <CardTitle>Invita al grupo</CardTitle>
          <p className="m-0 -mt-1.5 text-sm text-muted">Manda este link por donde quieras. Se abre en cualquier navegador.</p>
        </>
      )}
      <button
        type="button"
        onClick={copy}
        className="flex items-center justify-between gap-2.5 rounded-xl border-2 border-dashed border-[#c9d1f0] bg-[#f2f4fc] px-3.5 py-3 text-left text-sm"
      >
        <span className="truncate font-bold text-pblue">{url.replace(/^https?:\/\//, '')}</span>
        <b className="flex-none text-pred">{copied ? '¡Copiado!' : 'Copiar'}</b>
      </button>
      {!compact && (
        <Button variant="ghost" onClick={share} type="button">
          Compartir link
        </Button>
      )}
    </Card>
  );
}
