# RDC Persistente para macOS

Supervisor en JavaScript/Node.js para mantener Desktop Commander Remote disponible en macOS mediante `launchd`.

## Qué resuelve

- Inicia Desktop Commander Remote al iniciar sesión.
- `KeepAlive` vuelve a levantar el proceso si termina.
- Un watchdog revisa el servicio cada 60 segundos.
- Detecta arranques estancados, autenticación expirada y fallos del proceso.
- Tolera errores de almacenamiento como `ENOSPC` sin derribar RDC.
- Filtra payloads de tool calls y códigos de autenticación de los logs.
- Rota logs para evitar crecimiento indefinido.
- No contiene tokens, correos, rutas de usuario ni credenciales embebidas.

## Requisitos

- macOS.
- Node.js 22 o superior.
- `npm` disponible si Desktop Commander todavía no está instalado localmente.

Desktop Commander queda fijado actualmente a la versión `0.2.47`.

## Desarrollo

```bash
npm test
npm run check
```
## Instalación

Preparar archivos sin activar servicios:

```bash
npm run stage
```

Instalar y activar los dos `LaunchAgent`:

```bash
npm run install:local
```

El runtime se instala en `~/.local/share/rdc-macos-supervisor/` y el estado en `~/.local/state/rdc-macos-supervisor/`.

## Migrar un supervisor anterior

Si ya existen otros labels de `launchd`, indícalos al activar. Los nuevos servicios se levantan primero y después se deshabilitan los labels indicados:

```bash
RDC_REPLACE_LABELS='label.remote.anterior,label.watchdog.anterior' npm run install:local
```

No se eliminan archivos del supervisor anterior; solo se deshabilitan sus servicios en `launchd`.
## Estado y diagnóstico

```bash
npm run status
```

Para inspeccionar también labels externos:

```bash
RDC_STATUS_LABELS='label.uno,label.dos' npm run status
```

Los logs administrados por el supervisor son `remote.log` y `watchdog.log`; se rotan automáticamente y no dependen del stdout ilimitado de `launchd`.

## Arquitectura

- `bin/remote.js`: ejecuta Desktop Commander Remote con sesión persistente.
- `bin/watchdog.js`: evalúa salud y ejecuta `launchctl kickstart -k` cuando hace falta.
- `src/parser.js`: interpreta eventos de arranque, autenticación y disponibilidad.
- `src/state.js`: estado local atómico con protección frente a claves sensibles.
- `src/logger.js`: logging filtrado, tolerante a fallos y con rotación.
- `src/launchd.js`: genera los `plist` portables.
- `scripts/install.js`: staging, runtime y activación.

## Seguridad

El repositorio no almacena la sesión persistida de Desktop Commander. Esa sesión sigue siendo gestionada por el propio runtime en el equipo local. Los tokens OAuth detectados en salida se redactan y los códigos temporales no se escriben en los logs del supervisor.
