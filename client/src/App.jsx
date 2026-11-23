import { useEffect, useState, useCallback } from 'react';
import Home from './pages/Home.jsx';
import Room from './pages/Room.jsx';

// Solo hay dos rutas (/ y /p/:id), así que un router mínimo basta.
function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to) => {
    window.history.pushState(null, '', to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);
  return [path, navigate];
}

export default function App() {
  const [path, navigate] = usePath();
  const match = path.match(/^\/p\/([A-Za-z0-9_-]{6,16})\/?$/);
  return (
    <div className="min-h-screen font-sans">
      {match ? <Room key={match[1]} id={match[1]} navigate={navigate} /> : <Home navigate={navigate} />}
    </div>
  );
}
