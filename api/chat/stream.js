const systemPrompt = `Eres Nexus, un copiloto estratega dentro de una interfaz tipo Telegram.
Responde en espanol claro, accionable y con criterio. Prioriza valor real: planes,
checklists, decisiones, codigo, analisis y siguientes pasos. Evita relleno.`;

export const config = {
  maxDuration: 60,
};

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

Modo demo activo: agrega OPENAI_API_KEY en Vercel para respuestas reales con OpenAI.`;
}

function toResponsesInput(messages) {
  return messages.slice(-16).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [
      {
        type: message.role === 'assistant' ? 'output_text' : 'input_text',
        text: String(message.content || ''),
      },
    ],
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const { messages = [], persona = 'nexus' } = req.body || {};
  const model = process.env.AI_MODEL || 'gpt-5';

  if (!process.env.OPENAI_API_KEY) {
    const text = demoAnswer(messages, persona);
    for (const token of text.match(/.{1,18}(\s|$)/g) || [text]) {
      writeEvent(res, 'delta', { text: token });
    }
    writeEvent(res, 'done', { mode: 'demo' });
    res.end();
    return;
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: `${systemPrompt}\nModo activo: ${persona}.`,
        input: toResponsesInput(messages),
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text();
      writeEvent(res, 'error', {
        message: `OpenAI respondio ${upstream.status}: ${errorText.slice(0, 400)}`,
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
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const dataLine = part.split('\n').find((line) => line.startsWith('data: '));
        if (!dataLine) continue;
        const raw = dataLine.slice(6).trim();
        if (raw === '[DONE]') continue;

        try {
          const event = JSON.parse(raw);
          if (event.type === 'response.output_text.delta') {
            writeEvent(res, 'delta', { text: event.delta || '' });
          }
          if (event.type === 'response.completed') {
            writeEvent(res, 'done', { mode: 'openai', model });
          }
          if (event.type === 'response.failed') {
            writeEvent(res, 'error', { message: event.response?.error?.message || 'La respuesta fallo.' });
          }
        } catch {
          // Ignore partial or non-JSON SSE frames.
        }
      }
    }

    writeEvent(res, 'done', { mode: 'openai', model });
    res.end();
  } catch (error) {
    writeEvent(res, 'error', { message: error?.message || 'Error inesperado al llamar a OpenAI.' });
    res.end();
  }
}
