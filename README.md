# RDC Persistente

Supervisor multiplataforma en JavaScript/Node.js para mantener **Desktop Commander Remote** disponible después de cierres, reinicios del proceso y nuevos inicios de sesión.

- **Windows:** Task Scheduler bajo el usuario interactivo.
- **macOS:** `launchd` mediante `LaunchAgent`.
- Watchdog cada 60 segundos.
- Estado atómico, logs rotativos y filtrado de tokens/payloads sensibles.
- Desktop Commander fijado en `0.2.47`.
- Releases autocontenidos con Node.js `24.21.0` y npm `11.19.0`.

## Windows: instalación directa

El usuario final **no necesita instalar Node.js ni npm**. El ZIP del release ya contiene ambos.

Abre PowerShell con **Run PowerShell as Administrator** y ejecuta:

```powershell
irm https://raw.githubusercontent.com/AndresGaibor/rdc_persistente/main/install.ps1 | iex
```

El instalador descarga el release correspondiente a `x64` o `arm64`, verifica `SHA256SUMS`, instala en `%LOCALAPPDATA%\RdcPersistente` y registra las tareas `RdcPersistente\Remote` y `RdcPersistente\Watchdog`.
## Windows: Chocolatey

Chocolatey es opcional. Si todavía no lo tienes:

```powershell
powershell -c "irm https://community.chocolatey.org/install.ps1|iex"
```

Cuando el paquete esté publicado en Chocolatey Community:

```powershell
choco install rdc-persistente -y
```

También puedes descargar `rdc-persistente.0.2.0.nupkg` desde GitHub Releases e instalarlo localmente:

```powershell
choco install rdc-persistente --version 0.2.0 --source . -y
```

Para consultar el estado o desinstalar:

```powershell
.\status.ps1
.\uninstall.ps1
```
## macOS

Para instalar desde el repositorio:

```bash
git clone https://github.com/AndresGaibor/rdc_persistente.git
cd rdc_persistente
npm ci
npm run install:local
```

El instalador usa `launchd`, activa `RunAtLoad` + `KeepAlive` para RDC y un watchdog cada 60 segundos. El estado se guarda en `~/.local/state/rdc-persistente`.

Comandos útiles:

```bash
npm run status
npm run uninstall:local
```

Para migrar labels antiguos de `launchd` sin borrar sus archivos:

```bash
RDC_REPLACE_LABELS='label.remote.anterior,label.watchdog.anterior' npm run install:local
```

## Desarrollo
Para desarrollo puedes instalar exactamente Node.js 24.21.0 con Chocolatey:

```powershell
choco install nodejs --version="24.21.0" -y
node -v   # v24.21.0
npm -v    # 11.19.0
```

Después:

```bash
npm ci
npm test
npm run check
npm run stage
npm run dist -- --platform=darwin --arch=arm64
npm run dist:choco
```

`npm run stage` prepara archivos sin activar persistencia. `npm run install:local` sí registra y activa el mecanismo nativo del sistema operativo.

## Releases

Los tags `v*` generan automáticamente:

- `rdc-persistente-windows-x64.zip`
- `rdc-persistente-windows-arm64.zip`
- `rdc-persistente-macos-arm64.tar.gz`
- `rdc-persistente-macos-x64.tar.gz`
- `rdc-persistente.<version>.nupkg`
- `SHA256SUMS`
## Arquitectura

- `bin/remote.js`: ejecuta Desktop Commander con `remote --persist-session`.
- `bin/watchdog.js`: aplica la política de salud y reinicio.
- `src/platform/macos/`: `launchd`, lifecycle y paths macOS.
- `src/platform/windows/`: Task Scheduler, lifecycle y paths Windows.
- `src/state.js`: estado local atómico.
- `src/logger.js`: filtrado y rotación de logs.
- `scripts/build-dist.js`: crea bundles autocontenidos con Node y Desktop Commander.
- `packaging/chocolatey/`: metadata y hooks del paquete Chocolatey.

## Seguridad y datos locales

La sesión persistente de Desktop Commander continúa siendo gestionada por Desktop Commander en el equipo local; no se incluye en Git ni en los releases. Los tokens OAuth detectados en la salida se redactan y los códigos temporales de autenticación no se guardan en los logs del supervisor.

La desinstalación elimina únicamente tareas/LaunchAgents y rutas propiedad de RDC Persistente. No intenta borrar datos externos de la cuenta de Desktop Commander.

## Licencia

MIT.
