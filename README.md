# Nexusgram AI

Interfaz web tipo Telegram para chatear con agentes de IA. Incluye:

- Chat con streaming desde un backend local Express.
- Modo demo si no hay `OPENAI_API_KEY`.
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

## Activar IA real

No pegues claves en el frontend. Crea un archivo `.env` local:

```env
OPENAI_API_KEY=sk-proj-tu-clave-rotada
AI_MODEL=gpt-5
PORT=8787
```

Despues reinicia:

```bash
npm run dev
```

Si no hay clave, la app funciona en modo demo y la barra lateral mostrara `Demo local`.
