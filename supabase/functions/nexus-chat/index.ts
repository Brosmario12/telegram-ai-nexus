const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const systemPrompt = `Eres Nexus, un copiloto estratega dentro de una interfaz tipo Telegram.
Responde en espanol claro, accionable y con criterio. Prioriza valor real: planes,
checklists, decisiones, codigo, analisis y siguientes pasos. Evita relleno.`;

function demoAnswer(messages = [], persona = "nexus") {
  const last = messages.at(-1)?.content || "Necesito una idea potente.";
  const personas = {
    build: "Arquitectura rapida",
    creative: "Concepto fuera de serie",
    research: "Mapa de investigacion",
    code: "Plan tecnico",
    nexus: "Respuesta Nexus",
  };

  return `${personas[persona] || personas.nexus}: tome tu mensaje "${last.slice(0, 110)}" y lo convertiria en una accion concreta.

1. Objetivo: definir que resultado quieres producir y que restriccion no se puede romper.
2. Ruta: dividirlo en una demo visual, una capa de datos y una automatizacion con IA.
3. Valor: dejar botones utiles, historial, perfiles de agente y exportacion para que no sea solo una caja de texto.

Modo demo activo: agrega OPENAI_API_KEY como secret en Supabase para respuestas reales.`;
}

function toResponsesInput(messages) {
  return messages.slice(-16).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [
      {
        type: message.role === "assistant" ? "output_text" : "input_text",
        text: String(message.content || ""),
      },
    ],
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const { messages = [], persona = "nexus" } = await req.json().catch(() => ({}));
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("AI_MODEL") || "gpt-5";

  if (!apiKey) {
    return Response.json(
      {
        mode: "demo",
        text: demoAnswer(messages, persona),
      },
      { headers: corsHeaders },
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: `${systemPrompt}\nModo activo: ${persona}.`,
      input: toResponsesInput(messages),
    }),
  });

  const data = await upstream.json();
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("") || "";

  return Response.json(
    {
      mode: "openai",
      model,
      text,
    },
    { status: upstream.ok ? 200 : upstream.status, headers: corsHeaders },
  );
});
