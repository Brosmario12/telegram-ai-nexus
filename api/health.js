export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    mode: process.env.OPENAI_API_KEY ? 'openai' : 'demo',
    model: process.env.AI_MODEL || 'gpt-5',
    runtime: 'vercel',
  });
}
