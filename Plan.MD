# Plan: Salas y Lobby Multi-Juego

## Objetivo

Separar la creación de la sala de la configuración de la partida:

1. El usuario crea una sala indicando nombre y avatar.
2. Los jugadores se unen mediante código.
3. En el lobby, el host selecciona el juego.
4. El lobby muestra las versiones y expansiones compatibles.
5. El host confirma la configuración e inicia la partida.

El flujo debe conservar el soporte actual de Unstable Unicorns y preparar la plataforma para Exploding Kittens.

## Estado actual

- `CreateRoom.tsx` fija `unstable-unicorns`.
- `Room.game` se define al crear la sala y no puede cambiarse.
- `Lobby.tsx` tiene `rainbow_apocalypse` codificada directamente.
- `Room.expansions` contiene strings sin validación.
- El servidor siempre inicia el motor de Unstable Unicorns.
- Cliente y servidor tienen tipos duplicados para `Room` y `Player`.
- Existen dos flujos de creación: REST y Socket.IO.

## Fase 1: Modelo de configuración

Crear tipos compartidos para juegos, versiones y expansiones:

```ts
interface RoomSettings {
  gameId: string | null;
  versionId?: string | null;
  expansionIds: string[];
}

interface GameDefinition {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  versions: VersionDefinition[];
  expansions: ExpansionDefinition[];
}
```

La sala deberá almacenar una configuración explícita:

```ts
{
  settings: {
    gameId: null,
    versionId: null,
    expansionIds: []
  }
}
```

## Fase 2: Crear sala

Modificar `client/src/pages/CreateRoom.tsx` para que solicite únicamente:

- Nombre del jugador.
- Avatar.

Eliminar la selección fija de Unstable Unicorns. La sala se creará sin juego seleccionado y el usuario será enviado al lobby.

El servidor deberá aceptar una sala con:

```ts
gameId: null
expansionIds: []
```

Las validaciones deben incluir nombre obligatorio, avatar válido y errores visibles dentro de la UI en lugar de `alert`.

## Fase 3: Catálogo de juegos

Crear un registro central en el servidor:

```txt
server/src/games/GameRegistry.ts
server/src/games/catalog.ts
shared/types/GameDefinition.ts
```

El registro deberá permitir:

- Listar juegos disponibles.
- Consultar versiones y expansiones.
- Validar configuraciones.
- Obtener límites de jugadores.
- Determinar si un juego puede iniciar una partida.

Añadir endpoints de solo lectura:

```txt
GET /games
GET /games/:gameId
```

Unstable Unicorns se registrará como disponible. Exploding Kittens podrá registrarse como `próximamente` hasta que su motor esté implementado.

## Fase 4: Rediseño del lobby

El lobby tendrá cuatro bloques principales.

### Información de la sala

- Código de acceso.
- Botón para copiar.
- Lista de jugadores.
- Estado de conexión.
- Límite de jugadores dinámico.

### Selección de juego

Solo el host podrá modificarla. Cada juego se mostrará con:

- Imagen o icono.
- Nombre.
- Descripción.
- Número de jugadores.
- Estado disponible o próximamente.
- Indicador de selección.

Al cambiar de juego se limpiarán las expansiones anteriores y se cargarán las opciones compatibles.

### Selección de versión

Si el juego tiene varias ediciones, el host podrá seleccionar una versión. El servidor deberá verificar que la versión pertenezca al juego seleccionado.

### Selección de expansiones

Renderizar las expansiones desde el catálogo, eliminando condiciones específicas como:

```ts
room.expansions?.includes('rainbow_apocalypse')
```

Cada expansión tendrá ID, nombre, descripción, icono, requisitos y compatibilidad. Los invitados podrán ver la configuración, pero solo el host podrá modificarla.

## Fase 5: Eventos de sala

Añadir o reemplazar `toggle-expansion` por un evento de configuración completa:

```ts
'update-room-settings'
```

Payload:

```ts
{
  roomCode: string;
  gameId: string | null;
  versionId?: string | null;
  expansionIds: string[];
}
```

El servidor deberá:

1. Verificar que el emisor sea el host.
2. Verificar que el juego exista.
3. Verificar que la versión pertenezca al juego.
4. Verificar que las expansiones sean compatibles.
5. Rechazar cambios después de iniciar la partida.
6. Emitir el estado actualizado mediante `room-updated`.

## Fase 6: Tipos, sesiones y seguridad

Eliminar los tipos locales de `Lobby.tsx` y usar los tipos compartidos.

Crear DTOs públicos separados:

```ts
interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
}

interface PublicRoom {
  code: string;
  hostId: string;
  players: PublicPlayer[];
  settings: RoomSettings;
}
```

Además:

- No enviar `sessionToken` dentro de `Room` o `Player`.
- No identificar jugadores por nombre.
- No aceptar `socketId` arbitrario desde el cliente.
- Centralizar la validación de pertenencia a la sala.
- Mantener una única fuente de verdad para el estado de la sala en `GameContext`.

## Fase 7: Inicio de partida

El botón de inicio estará deshabilitado si:

- No hay un juego seleccionado.
- El juego está marcado como próximamente.
- La versión es inválida.
- Hay expansiones incompatibles.
- No se cumple el mínimo de jugadores.
- La partida ya comenzó.

El servidor repetirá todas las validaciones antes de iniciar el motor. La selección de turnos existente se conservará después de validar la configuración.

## Fase 8: Preparación de Exploding Kittens

Registrar inicialmente:

```ts
gameId: 'exploding-kittens'
```

El sistema deberá poder mostrarlo, seleccionarlo y guardar su configuración sin permitir iniciar la partida hasta que exista su motor.

La implementación de sus reglas deberá conectarse mediante `GameRegistry`, sin modificar el flujo general de salas y lobby.

## Orden de implementación

1. Crear tipos de catálogo y configuración.
2. Implementar `GameRegistry`.
3. Permitir salas sin juego seleccionado.
4. Añadir endpoints del catálogo.
5. Rediseñar `CreateRoom.tsx`.
6. Rediseñar `Lobby.tsx` con selección dinámica.
7. Añadir el evento seguro de actualización de configuración.
8. Unificar tipos y DTOs públicos.
9. Actualizar las validaciones de inicio.
10. Añadir pruebas de salas y compatibilidad de expansiones.
11. Registrar Exploding Kittens como próximamente.
12. Comenzar la implementación de su motor de juego.

## Criterios de finalización

- Se puede crear una sala sin elegir juego.
- Los jugadores pueden unirse mediante código.
- El host puede seleccionar Unstable Unicorns desde el lobby.
- Solo se muestran y habilitan expansiones válidas.
- La configuración se sincroniza con todos los jugadores.
- Se puede registrar Exploding Kittens sin romper el flujo existente.
- Las configuraciones inválidas son rechazadas por el servidor.
- El flujo actual de Unstable Unicorns continúa funcionando.

---

# Plan: Reestructuración Técnica

Este plan continúa el trabajo de modularización del motor de juego. Cada fase debe
terminar con build correcto y tests relevantes pasando antes de comenzar la siguiente.

## Estado Actual

- [x] Hooks de efectos de inicio de turno.
- [x] Helpers iniciales para movimiento de cartas.
- [x] Separación inicial de efectos pasivos y activos.
- [x] Categorías iniciales de `PendingAction`.
- [ ] Extracción completa de handlers Socket.IO.
- [x] Helper común para `Remove From Game`.
- [x] Datos de cartas separados por expansión.
- [x] Tests iniciales de cartas con reglas globales.
- [x] Suite completamente verde.

## Fase 1: Suite Verde [COMPLETADA]

Corregir el fallo de `Zombie Unicorn` y evitar mezclar el dispatcher legacy de
`TurnManager` con los hooks nuevos.

Archivos principales:

- `server/src/game/turn/TurnManager.ts`
- `server/src/game/cards/effects/zombieUnicorn.ts`
- `server/tests/turnBeginning.test.ts`

Criterios:

- `npm run build` del servidor correcto.
- Todos los tests pasan.
- `Zombie Unicorn` usa un único flujo de inicio de turno.

## Fase 2: Configuración Única De Sala [COMPLETADA]

Hacer `RoomSettings` la única fuente de verdad y retirar gradualmente `room.game`
y `room.expansions`.

Áreas afectadas:

- `shared/types/Room.ts`
- `shared/types/PublicRoom.ts`
- `server/src/RoomManager.ts`
- `server/src/game/unstable-unicorns/setup.ts`
- `server/src/sockets/publicRoom.ts`
- Cliente y DTOs públicos.

Criterios:

- Una sala nueva puede tener `gameId: null`.
- El setup lee únicamente `settings.expansionIds`.
- No existen fallbacks `settings ?? legacy` fuera de una frontera de compatibilidad explícita.

## Fase 3: Validación Centralizada [COMPLETADA]

Crear `GameRegistry.validateSettings()` y reutilizarlo en REST, Socket.IO, cambios
de configuración e inicio de partida.

Debe validar:

- Juego existente y disponible.
- Versión perteneciente al juego.
- Expansiones pertenecientes al juego.
- Expansiones disponibles y compatibles con la versión.
- Expansiones duplicadas.
- Número mínimo y máximo de jugadores.

Criterios:

- Una única implementación de las reglas de validación.
- Errores estructurados y reutilizables por cliente y servidor.

## Fase 4: Completar Handlers Socket.IO [COMPLETADA]

Reducir `server/src/sockets/actionHandlers.ts` a un compositor de módulos.

Módulos objetivo:

- `discardHandlers.ts`
- `stableSelectionHandlers.ts`
- `handSelectionHandlers.ts`
- `choiceHandlers.ts`
- `deckSelectionHandlers.ts`

Trabajo pendiente:

- Mover completamente la lógica de `select-choice`.
- Eliminar el adaptador `legacyHandler`.
- Eliminar funciones anidadas no utilizadas de `actionHandlers.ts`.
- Extraer timers y lógica común a un módulo neutral.

Criterios:

- `actionHandlers.ts` solo registra módulos.
- Cada módulo registra únicamente sus eventos.
- No hay listeners duplicados ni ramas legacy activas.

## Fase 5: Separación De Capas [COMPLETADA]

Eliminar dependencias del dominio hacia `sockets`.

Actualmente efectos y motores importan logging o animaciones desde la capa Socket.IO.

Objetivo:

- Crear un `GameContext` o `EngineContext` con logging, animaciones y eventos.
- Pasar ese contexto a efectos que lo necesiten.
- Mantener sockets como adaptadores de transporte.
- Eliminar ciclos entre `CardMovement`, `effects/index.ts`, `ActionResolver` y sockets.

Criterios:

- Ningún módulo bajo `server/src/game` importa módulos bajo `server/src/sockets`.
- El registro de efectos no participa en ciclos de runtime.

## Fase 6: Movimiento De Cartas [COMPLETADA]

Completar la centralización de transiciones entre zonas.

Operaciones objetivo:

- `drawCard`.
- `discardCard`.
- `moveToHand`.
- `enterStable`.
- `sacrifice`.
- `destroy`.
- `removeFromGame`.
- `returnToNursery`.

Criterios:

- No hay mutaciones directas de zonas en resolvers y sockets salvo dentro del módulo de movimiento.
- Baby Unicorn, Flying Unicorn, Barbed Wire, interceptores y animaciones se aplican exactamente una vez.
- Tests de invariantes para cada transición.

## Fase 7: Inicio De Turno

Migrar todos los efectos restantes a `canBeginTurn` y `onBeginningTurn`.

Objetivo:

- `TurnManager` solo administra la cola y el orden de resolución.
- Las cartas construyen sus propios `PendingAction`.
- Eliminar `BEGINNING_HOOK_IDS` y el switch legacy.

Criterios:

- No hay razones de cartas hardcodeadas en `TurnManager`.
- Cada carta de inicio tiene tests de disponibilidad y resolución.

## Fase 8: Pasivos Reales

Convertir `CardPassive` de marcador a mecanismo de reglas.

Consultas a centralizar:

- Límite de mano.
- Inmunidad a destrucción o sacrificio.
- Bloqueo de entrada al establo.
- Protección de cartas.
- Restricciones de acciones.
- Conteo de poder del establo.

Criterios:

- Las reglas pasivas no dependen de búsquedas dispersas por `card.id`.
- Cada modificador declara la consulta que modifica.

## Fase 9: Pending Actions

Reemplazar la unión monolítica por categorías y handlers exhaustivos.

Categorías:

- Selección de jugador.
- Selección de carta.
- Descarte.
- Elección.
- Selección del mazo.

Criterios:

- Variantes con campos opcionales mínimos.
- Sin casts `any` para resolver acciones.
- Ownership y razones validados por handler especializado.
- Tests de cada categoría y de acciones obsoletas.

## Fase 10: Servicios De Sala Y Motores

Unificar los flujos REST y Socket.IO mediante servicios de aplicación.

Servicios objetivo:

- Crear sala.
- Unirse a sala.
- Reanudar sesión.
- Actualizar configuración.
- Iniciar partida.

Reglas de seguridad:

- No aceptar `socketId` del cliente.
- No identificar jugadores por nombre.
- Reanudar únicamente mediante `sessionToken`.

Además, ampliar `GameEngine` para incluir dispatch de acciones, progresión de
turno y proyección de estado, evitando ramas `isExplodingKittensRoom()` en sockets.

## Fase 11: Organización De Efectos

Establecer una única convención para efectos:

- Efectos base.
- Efectos de `nightmares`.
- Efectos de `rainbow_apocalypse`.

Evitar mezclar implementaciones en `cards/effects`, `engine/effects` y
`engine/effects/unicorn` sin una regla clara.

Criterios:

- Cada efecto tiene una ubicación canónica.
- El catálogo de efectos se compone por expansión.
- No quedan objetos de efecto vacíos sin una justificación documentada.

## Fase 12: Cobertura De Integración

Añadir tests para:

- Configuración de salas.
- Compatibilidad de versiones y expansiones.
- Paridad REST/Socket.IO.
- Reanudación de sesión.
- Ownership de acciones pendientes.
- Timers y acciones obsoletas.
- Selección de motor por juego.
- Invariantes de movimiento de cartas.
- Separación entre reglas de Unstable Unicorns y Exploding Kittens.

## Orden De Ejecución

1. Suite verde y `Zombie Unicorn`.
2. Configuración única de sala.
3. Validación centralizada.
4. Handlers Socket.IO completos.
5. Separación de capas y eliminación de ciclos.
6. Movimiento de cartas completo.
7. Migración total de inicio de turno.
8. Pasivos reales.
9. `PendingAction` exhaustivo.
10. Servicios de sala y contrato completo de motores.
11. Organización final de efectos.
12. Cobertura de integración.
