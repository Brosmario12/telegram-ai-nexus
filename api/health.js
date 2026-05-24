export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    mode: process.env.GEMINI_API_KEY ? 'gemini' : 'demo',
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
    runtime: 'vercel',
  });
}
