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
