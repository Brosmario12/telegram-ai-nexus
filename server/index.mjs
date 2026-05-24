import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 8787);
const model = process.env.AI_MODEL || 'gemini-2.5-flash';

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const systemPrompt = `Eres Nexus, un copiloto estratega dentro de una interfaz tipo Telegram.
Responde en espanol claro, accionable y con criterio. Prioriza valor real: planes,
checklists, decisiones, codigo, analisis y siguientes pasos. Evita relleno.`;

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function demoAnswer(messages = [], persona = 'nexus') {
  const last = messages.at(-1)?.content || 'Necesito una idea potente.';
  const personas = {
    build: 'Arquitectura rapida',
    creative: 'Concepto fuera de serie',
    research: 'Mapa de investigacion',
    code: 'Plan tecnico',
    nexus: 'Respuesta Nexus',
  };

  return `${personas[persona] || personas.nexus}: tome tu mensaje "${last.slice(0, 110)}" y lo convertiria en una accion concreta.

1. Objetivo: definir que resultado quieres producir y que restriccion no se puede romper.
2. Ruta: dividirlo en una demo visual, una capa de datos y una automatizacion con IA.
3. Valor: dejar botones utiles, historial, perfiles de agente y exportacion para que no sea solo una caja de texto.

Modo demo activo: agrega GEMINI_API_KEY en .env para respuestas reales con Gemini.`;
}

function toGeminiContents(messages) {
  return messages.slice(-16).map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [
      {
        text: String(message.content || ''),
      },
    ],
  }));
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.GEMINI_API_KEY ? 'gemini' : 'demo',
    model,
  });
});

app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { messages = [], persona = 'nexus' } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    const text = demoAnswer(messages, persona);
    for (const token of text.match(/.{1,18}(\s|$)/g) || [text]) {
      writeEvent(res, 'delta', { text: token });
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    writeEvent(res, 'done', { mode: 'demo' });
    res.end();
    return;
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${systemPrompt}\nModo activo: ${persona}.` }],
        },
        contents: toGeminiContents(messages),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      writeEvent(res, 'error', {
        message: `Gemini respondio ${upstream.status}: ${errorText.slice(0, 400)}`,
      });
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const dataLine = part.split(/\r?\n/).find((line) => line.startsWith('data: '));
        if (!dataLine) continue;
        const raw = dataLine.slice(6).trim();
        if (raw === '[DONE]') continue;

        try {
          const event = JSON.parse(raw);
          const text = event.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
          if (text) writeEvent(res, 'delta', { text });
        } catch {
          // Ignore partial or non-JSON SSE frames.
        }
      }
    }

    writeEvent(res, 'done', { mode: 'gemini', model });
    res.end();
  } catch (error) {
    writeEvent(res, 'error', { message: error?.message || 'Error inesperado al llamar a Gemini.' });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Nexus API running on http://localhost:${port}`);
});
