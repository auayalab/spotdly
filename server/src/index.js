import { createServer } from './app.js';
import { MemoryStore } from './store.js';
import { plans } from './plans.js';

const PORT = Number(process.env.PORT) || 3000;

const store = new MemoryStore();
const { server } = createServer({ store, plans });

// Limpia salas viejas cada 10 minutos
setInterval(() => {
  const removed = store.sweep();
  if (removed) console.log(`Salas expiradas eliminadas: ${removed}`);
}, 10 * 60 * 1000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Spotdly x Pepsi escuchando en http://localhost:${PORT}`);
});
