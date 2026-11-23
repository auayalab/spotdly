# Pepsi Moment Planner

Prueba técnica para **Spotdly**, reto *"Make Pepsi Part of the Moment"*.

> **La idea en una frase:** un link del plan que mandas al grupo por la app que quieras: cada quien vota en 30 segundos desde su teléfono y la app elige el plan en Miami que mejor le queda a todos. Si hay empate, se decide con un **Pepsi Challenge** a ciegas. La recomendación final trae la hielera del grupo armada con la Pepsi de cada quien.

- **Demo:** `https://<tu-app>.up.railway.app` *(agregar el enlace después del deploy)*
- **Stack:** Node.js + Express + Socket.io · React + Vite + Tailwind CSS v4 · tests con `node:test`

---

## Cómo correrlo

Requisitos: Node 20 o superior.

```bash
npm run install:all      # instala server/ y client/
npm test                 # corre los tests de la lógica (20 casos)
```

**Desarrollo** (dos terminales):

```bash
npm run dev:server       # API + sockets en http://localhost:3000
npm run dev:client       # React en http://localhost:5173 (proxy hacia :3000)
```

**Modo producción en local** (igual que en Railway, un solo proceso):

```bash
npm run build && npm start   # todo en http://localhost:3000
```

### Probar la interacción entre participantes en local

1. Abre `http://localhost:5173`, escribe tu nombre y crea el plan.
2. Copia el enlace y ábrelo en una **ventana de incógnito** o en otro navegador. Cada uno cuenta como una persona distinta porque la sesión vive en `localStorage`.
3. Para probar desde el teléfono, conéctalo a la misma red Wi-Fi y abre `http://<IP-de-tu-compu>:5173/p/<id>`. Vite ya escucha en la red (`host: true`).
4. Casos que vale la pena probar a mano: recargar a mitad de la votación, mandar el formulario dos veces, entrar con el enlace después de que el plan ya se decidió, y poner el teléfono en modo avión y volver.

---

## 1. La idea

Decidir en grupo falla por tres razones: todos proponen al mismo tiempo, nadie sabe qué quieren los demás y nadie se anima a cerrar la decisión. La app resuelve las tres:

- **Proponer → preferir.** Nadie propone planes. Cada quien marca qué se le antoja, cuánto quiere gastar, cuándo puede y qué no quiere ni de broma.
- **Claridad.** Todos ven en vivo quién ya respondió.
- **Cierre.** El anfitrión revela el resultado y la app explica **por qué** ganó ese plan, para que nadie sienta que fue arbitrario.

## 2. La experiencia

```
Anfitrión crea el plan ─► comparte el link (menú nativo del teléfono o Copiar)
        │
Amigos abren el link ─► escriben su nombre ─► eligen:
        • vibe (hasta 2)   • presupuesto $/$$/$$$   • horario
        • 1 veto           • su Pepsi (Pepsi / Zero Sugar / Wild Cherry)
        │
Sala de espera en vivo: "3 de 4 listos"
        │
Anfitrión: "Elegir el plan del grupo"
        ├─ diferencia clara ─► RESULTADO
        └─ empate técnico ──► PEPSI CHALLENGE (A vs B, voto a ciegas) ─► RESULTADO
                                      │
RESULTADO: plan + razones + "Momento Pepsi" + hielera del grupo + plan B
          ─► "Compartir el plan" (resumen + link, por cualquier app)
```

### Cómo se integra Pepsi (sin banners)

Pepsi aparece en los momentos donde el grupo decide y comparte, y siempre forma parte de la mecánica:

1. **"Tu Pepsi para el plan"** es una pregunta más del formulario. Es la única que no afecta la recomendación, pero alimenta la **hielera del grupo** que aparece en el resultado ("×2 Zero Sugar, ×1 Wild Cherry"), que también funciona como lista de compras.
2. **Pepsi Challenge.** Retoma la prueba a ciegas, una referencia que mucha gente reconoce, como **mecánica de desempate**: dos finalistas, A o B, sin ver puntos ni votos. Le da emoción justo en el momento más tenso de la decisión.
3. **Momento Pepsi.** Cada plan del catálogo trae una sugerencia de cómo encaja Pepsi en ese plan (el brindis al atardecer, el premio del equipo ganador). Es el gancho natural para una alianza real con lugares.
4. **La tarjeta final** que se comparte lleva la identidad visual de la marca, así que la marca viaja al chat del grupo.

No se usa el logotipo oficial: solo el nombre, los colores y latas ilustradas con CSS.

### Lógica de la recomendación

Está en `server/src/recommend.js` y es una función pura (mismas entradas, mismo resultado). Para cada plan y cada persona que respondió:

| Regla | Puntos |
|---|---|
| El plan es de un vibe que la persona eligió | +3 |
| Entra en su presupuesto | +2 |
| Se pasa del presupuesto | −2 por cada nivel de $ |
| El horario le queda (o no marcó horario) | +1 |
| **Veto** | el plan queda **fuera** |

- **Por qué estos pesos:** el vibe pesa más porque define si el plan "se antoja". El presupuesto penaliza fuerte porque es lo que más bloquea que alguien vaya. El horario pesa poco porque suele ser negociable.
- **El veto es un "no" duro.** Un plan que alguien vetó nunca gana. Si *todos* los planes tienen algún veto, gana el menos vetado, para que el grupo nunca se quede sin resultado.
- **Desempate determinista:** puntos → menos personas fuera de presupuesto → más fans del vibe → id del plan.
- **Empate técnico** (1.º y 2.º a ≤ 1 punto, con 2 o más votantes) → Pepsi Challenge. Si el Challenge también empata, gana el que iba arriba en puntos.
- El resultado muestra sus **razones** ("2 de 3 querían playa", "Entra en el presupuesto de todos", "Nadie lo vetó").
- Las respuestas individuales **nunca se publican**: solo se muestra quién ya respondió. Así nadie se siente juzgado por su presupuesto o su veto.

## 3. El problema técnico: estado compartido

**Fuente de verdad única en el servidor.** Cada sala vive en el servidor (`MemoryStore`). Los clientes nunca calculan el estado: lo reciben.

- **Acciones por REST** (`POST/PUT /api/rooms/:id/...`). Son fáciles de probar y de reintentar.
- **Avisos por Socket.io.** Después de cada cambio, el servidor emite `room:state` con la vista pública completa a todos los que miran la sala. Se manda el estado completo, no un diff, así que un evento perdido no deja a nadie desfasado.
- **`version` creciente** en cada cambio. El cliente descarta cualquier estado con versión menor a la que ya tiene, por si una respuesta HTTP vieja llega después de un evento de socket más nuevo.
- **Atomicidad.** Node ejecuta en un solo hilo y cada operación es síncrona (leer → validar → modificar), así que dos votos simultáneos no se pisan.

| Situación | Cómo se maneja |
|---|---|
| **Alguien llega tarde** | Puede entrar en cualquier momento. Si la votación está abierta, vota normal. Si ya hay resultado, lo ve y aparece en "Van:", pero no puede cambiar el resultado. El anfitrión puede **reabrir la votación** para incluirlo. En el Pepsi Challenge también puede votar. |
| **Recarga la página** | Al unirse, el servidor entrega un `token` secreto que se guarda en `localStorage` por sala. Al recargar, la app lo reconoce sin pedir el nombre otra vez. Si vuelve a unirse con ese token, el servidor devuelve la misma persona y no la duplica. |
| **Envía su respuesta más de una vez** | El guardado es un **upsert por participante**: reemplaza, nunca suma. Un envío idéntico ni siquiera genera un cambio de versión. Además el botón se bloquea mientras guarda, y si falla la red se reintenta una vez sin riesgo. |
| **Se le va la señal / el teléfono se duerme** | Socket.io se reconecta solo y, al reconectar, pide el estado completo. Al volver a la pestaña (`visibilitychange`) se vuelve a pedir el estado por REST. Mientras está desconectado aparece el aviso "Reconectando…". |
| **Alguien intenta votar por otro** | Las acciones requieren el `token` del participante, que nunca aparece en la vista pública. Solo el anfitrión (por su token) puede cerrar, resolver o reabrir. |
| **Dos personas crean el plan con doble tap** | El botón se bloquea mientras crea. Además hay límite de 30 salas por IP cada 10 minutos. |

## 4. El criterio

**Decisiones**

- **Monorepo con un solo servicio.** Express sirve la API, los sockets y el build de React. Un solo deploy, un solo enlace y sin CORS.
- **REST para escribir, sockets para avisar.** Lo crítico (votar) no depende de que el socket esté vivo; el socket solo hace que se sienta en tiempo real.
- **La lógica de negocio separada del transporte.** `recommend.js` (puro) y `rooms.js` (reglas de la sala) no saben nada de Express ni de Socket.io. Por eso se prueban sin levantar el servidor y se podrían mover a otra infraestructura sin reescribirse.
- **Compartir sin depender de una red social.** El enlace `/p/:id` funciona en cualquier navegador. El botón usa la Web Share API (el menú nativo del teléfono: WhatsApp, iMessage, Telegram, Instagram…) y, si no existe, como en escritorio, copia el link.
- **Sin cuentas.** Solo nombre o apodo y un token anónimo por sala. Cumple el requisito de no recopilar datos personales y quita fricción: nadie va a crear una cuenta para decidir a dónde ir el sábado.
- **Tailwind CSS v4** con los colores de Pepsi como tokens del tema (`@theme` en `styles.css` → `bg-pblue`, `text-pred`, `shadow-card`…). Los estilos que se repiten viven en componentes pequeños (`components/ui.jsx`: `Button`, `Card`, `Field`) en lugar de clases CSS. Solo las ilustraciones con pseudo-elementos (la lata y el punto de la marca) quedan en CSS.
- **Sin router ni librería de estado en React.** Solo hay dos rutas y un estado que viene del servidor, así que no hacían falta.
- **Tests con `node:test`** (incluido en Node). Cero dependencias para correrlos.
- **Catálogo en JSON** (`server/data/plans.json`): 16 planes de ejemplo en Miami que simulan un servicio externo de eventos o lugares.

**Lo que dejé fuera a propósito**

- Persistencia real (las salas viven en memoria y expiran tras 48 h sin actividad).
- Eventos reales, mapas, reservas y pagos.
- Más modos de dinámica (swipe tipo Tinder, ranking por posiciones).
- Analítica para la marca, internacionalización y accesibilidad auditada a fondo (los botones sí usan `aria-pressed` y se respeta `prefers-reduced-motion`).

## 5. Las pruebas

```bash
npm test
```

Hay 20 casos en `server/tests/` que cubren la lógica importante:

- **Recomendación** (`recommend.test.js`): gana lo que eligió la mayoría; un veto saca al plan aunque tenga más puntos; si todo está vetado, gana el menos vetado; la penalización por presupuesto; cuándo se activa el Pepsi Challenge; el resultado es determinista aunque cambie el orden de entrada; quien no votó no cuenta; cómo se arma la hielera.
- **Sala** (`rooms.test.js`): recargar con el mismo token no duplica; enviar dos veces reemplaza; solo el anfitrión cierra; quien llega tarde ve el resultado pero no vota hasta que se reabre; el Challenge se resuelve solo cuando votan todos; la vista pública no filtra tokens ni respuestas; validación de entradas; expiración de salas.

También corrí un **recorrido completo en navegador** (Playwright, viewport de iPhone, dos y luego tres participantes): crear → unirse → recargar a mitad → votar → empate → Pepsi Challenge → resultado → llega alguien tarde. No hubo errores de consola.

**Qué probaría antes de lanzar**

- Tests de integración de la API (supertest) y de los sockets con varios clientes simultáneos.
- E2E en navegadores reales: Safari de iOS, Chrome de Android, el navegador interno de WhatsApp e Instagram (donde se abrirán la mayoría de los enlaces), con red lenta y en modo privado.
- Pruebas de carga: 1 sala con 20 personas votando a la vez y miles de salas concurrentes.
- Reconexión: cortar la red justo al enviar, con el servidor reiniciándose.
- Pruebas de usabilidad con grupos reales para ajustar los pesos del algoritmo.

## 6. Pensando en escala

Si Pepsi lanzara esto en una campaña para miles de personas:

**Confiabilidad**
- Hoy las salas viven en la memoria de un solo proceso: un reinicio las borra y no se puede tener más de una instancia. Cambiaría `MemoryStore` por **Redis** (estado de sala con TTL y operaciones atómicas por sala) o **Postgres** si se necesita historial. La interfaz del store ya está aislada para esto.
- Para varias instancias: **adaptador de Redis para Socket.io** (o sticky sessions) para que el aviso llegue a todos sin importar a qué servidor están conectados.
- Health checks, réplicas en al menos dos zonas y despliegues sin tiempo fuera.
- Si el socket falla, la app ya puede seguir con REST y refrescos: es la degradación natural.

**Rendimiento**
- El frontend estático va a un **CDN**. El tráfico de la campaña llega primero ahí, no al servidor.
- La vista pública se puede cachear por `version`. El catálogo de planes se cachea completo.
- Limitar el tamaño de las salas (ya está en 20) y agrupar avisos si hay ráfagas de votos.
- El cuello de botella real sería un pico al lanzar la campaña (todos abriendo el link a la vez): pruebas de carga y autoescalado antes del lanzamiento.

**Seguridad y abuso**
- Rate limiting distribuido (en Redis o en el CDN/WAF), no en memoria por instancia como ahora.
- IDs de sala más largos si se quiere evitar que alguien adivine enlaces, o salas privadas con código.
- Filtro de groserías en nombres y títulos, porque aparecen en tarjetas que se comparten con la marca.
- Headers de seguridad (CSP, HSTS), validación estricta (ya existe) y límites de tamaño de payload (ya existe: 10 kb).
- Privacidad: hoy no se guardan datos personales. Si se agrega analítica para Pepsi, debe ser agregada, anónima, con aviso de privacidad y cumpliendo las leyes de Florida y de los países de la audiencia.

**Observabilidad**
- Logs estructurados, métricas (salas creadas, % que llega a resultado, tiempo hasta decidir, uso del Challenge) y alertas. Esas mismas métricas sirven para medir si la experiencia funciona para la marca.

## Límites conocidos

- Las salas viven en memoria: se borran si el servidor se reinicia o se redespliega.
- Hay una sola instancia; no escala horizontalmente sin los cambios de la sección 6.
- El catálogo es de ejemplo; las descripciones de lugares son ilustrativas.
- El nombre de una persona no es único: dos "Ana" se distinguen solo por su token.
- El token vive en `localStorage`: si alguien abre el enlace en otro navegador o borra los datos, entra como persona nueva.
- Concepto no oficial: no usa activos de marca de PepsiCo.

## Uso de IA

Usé Claude como pareja de programación para:

- Discutir la dinámica de decisión y la integración de marca antes de escribir código.
- Generar el esqueleto del monorepo y una primera versión de la lógica, que después revisé y ajusté.
- Escribir y ampliar los casos de prueba, sobre todo los casos borde (vetos totales, empates, tokens).
- Revisar el flujo completo en un navegador móvil simulado y detectar problemas visuales.

## Estructura

```
spotdly-pepsi/
├── package.json           scripts de la raíz (build, start, test)
├── railway.json           configuración de deploy
├── server/
│   ├── data/plans.json    catálogo de ejemplo (16 planes en Miami)
│   ├── src/
│   │   ├── index.js       arranque
│   │   ├── app.js         rutas Express + Socket.io
│   │   ├── rooms.js       reglas de la sala (unirse, votar, cerrar, challenge)
│   │   ├── recommend.js   algoritmo de recomendación (puro)
│   │   ├── validate.js    validación de entradas
│   │   └── store.js       almacenamiento en memoria con TTL
│   └── tests/             node:test
└── client/
    └── src/
        ├── pages/         Home, Room
        ├── components/    ui (Button, Card…), JoinForm, PrefsForm, Waiting, Challenge, Result…
        ├── styles.css     Tailwind + tema de marca
        └── lib/           api, session (localStorage), useRoom (REST + socket)
```

## API

| Método | Ruta | Cuerpo | Qué hace |
|---|---|---|---|
| POST | `/api/rooms` | `{ name, title? }` | Crea la sala; devuelve `me.token` del anfitrión |
| GET | `/api/rooms/:id` | — | Vista pública de la sala |
| POST | `/api/rooms/:id/join` | `{ name, token? }` | Unirse o volver a entrar |
| PUT | `/api/rooms/:id/prefs` | `{ token, prefs }` | Guardar preferencias (upsert) |
| POST | `/api/rooms/:id/close` | `{ token }` | Anfitrión: calcular resultado |
| POST | `/api/rooms/:id/challenge` | `{ token, choice: 'a'\|'b' }` | Voto del Pepsi Challenge |
| POST | `/api/rooms/:id/challenge/resolve` | `{ token }` | Anfitrión: resolver ya |
| POST | `/api/rooms/:id/reopen` | `{ token }` | Anfitrión: reabrir votación |

Socket.io: el cliente emite `room:watch` con el id y recibe `room:state` con cada cambio.
