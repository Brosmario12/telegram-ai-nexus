# Nexusgram AI

Interfaz web tipo Telegram para chatear con agentes de IA. Incluye:

- Chat con streaming desde un backend local Express.
- Modo demo si no hay `GEMINI_API_KEY`.
- Canales/agentes: Nexus, Builder, Muse, Scout y Forge.
- Historial persistente en `localStorage`.
- Busqueda de chats, exportacion `.txt`, comandos rapidos y panel de contexto.
- Asset visual generado para la experiencia en `public/media/nexus-backdrop.png`.

## Arranque

```bash
npm install
npm run dev
```

Web:

```text
http://localhost:5173
```

API:

```text
http://localhost:8787/api/health
```

## Activar IA real con Gemini

No pegues claves en el frontend. Crea un archivo `.env` local:

```env
GEMINI_API_KEY=AIza-tu-clave
AI_MODEL=gemini-2.5-flash
PORT=8787
```

Despues reinicia:

```bash
npm run dev
```

Si no hay clave, la app funciona en modo demo y la barra lateral mostrara `Demo local`.
