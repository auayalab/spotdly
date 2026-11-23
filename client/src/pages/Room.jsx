import { useState } from 'react';
import { useRoom } from '../lib/useRoom.js';
import { loadSession } from '../lib/session.js';
import Brand from '../components/Brand.jsx';
import ShareCard from '../components/ShareCard.jsx';
import JoinForm from '../components/JoinForm.jsx';
import PrefsForm from '../components/PrefsForm.jsx';
import Waiting from '../components/Waiting.jsx';
import Challenge from '../components/Challenge.jsx';
import Result from '../components/Result.jsx';
import { Button, Card, Eyebrow, Screen } from '../components/ui.jsx';

const STATUS_LABEL = {
  voting: 'Votación abierta',
  challenge: 'Desempate',
  decided: 'Plan decidido',
};

export default function Room({ id, navigate }) {
  const { room, error, online, apply, refresh } = useRoom(id);
  const [session, setSession] = useState(() => loadSession(id));
  const [editing, setEditing] = useState(false);

  const goHome = () => navigate('/');

  if (error === 'not_found') {
    return (
      <Screen>
        <Brand onClick={goHome} />
        <Card className="text-center">
          <h2 className="m-0 text-[26px] font-black">Este plan ya no existe</h2>
          <p className="m-0 text-muted">Puede que el link esté mal o que haya expirado.</p>
          <Button big onClick={goHome}>
            Crear un plan nuevo
          </Button>
        </Card>
      </Screen>
    );
  }

  if (!room) {
    return (
      <Screen>
        <Brand onClick={goHome} />
        <Card className="text-center">
          {error === 'network' ? (
            <>
              <p className="m-0">No pudimos cargar el plan.</p>
              <Button onClick={refresh}>Reintentar</Button>
            </>
          ) : (
            <p className="m-0 text-muted">Cargando el plan…</p>
          )}
        </Card>
      </Screen>
    );
  }

  const me = session ? room.participants.find((p) => p.id === session.id) : null;

  let body;
  if (!me) {
    body = (
      <JoinForm
        room={room}
        onJoined={(s, r) => {
          setSession(s);
          apply(r);
        }}
      />
    );
  } else if (room.status === 'voting') {
    body =
      !me.ready || editing ? (
        <PrefsForm
          room={room}
          session={session}
          onCancel={me.ready ? () => setEditing(false) : null}
          onSaved={(s, r) => {
            setSession(s);
            apply(r);
            setEditing(false);
            window.scrollTo(0, 0);
          }}
        />
      ) : (
        <Waiting room={room} me={me} session={session} onEdit={() => setEditing(true)} onRoom={apply} />
      );
  } else if (room.status === 'challenge') {
    body = <Challenge room={room} me={me} session={session} onSession={setSession} onRoom={apply} />;
  } else {
    body = <Result room={room} me={me} session={session} onRoom={apply} />;
  }

  return (
    <Screen>
      <Brand onClick={goHome} />
      {!online && (
        <div className="rounded-xl bg-[#fff4d6] px-3 py-2 text-[13px] font-semibold text-[#7a5200]">
          Reconectando… tus respuestas ya guardadas no se pierden.
        </div>
      )}
      {me && (
        <div className="px-0.5 pt-0.5 text-white">
          <Eyebrow>{STATUS_LABEL[room.status]}</Eyebrow>
          <h1 className="mt-1 mb-0 text-3xl leading-tight font-black tracking-tight">{room.title}</h1>
        </div>
      )}
      {me && room.status === 'voting' && <ShareCard room={room} compact={!me.isHost && me.ready} />}
      {body}
    </Screen>
  );
}
