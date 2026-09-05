export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body || {};
  const HF_TOKEN = process.env.HF_TOKEN;

  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN environment variable is missing on Vercel! 💀' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Please provide a prompt! 😭' });
  }

  try {
    // New Hugging Face router endpoint
    const hfResponse = await fetch(
      'https://router.huggingface.co/hf-inference/models/damo-vilab/text-to-video-ms-1.7b',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    // Rate Limit or Quota Exceeded
    if (hfResponse.status === 429) {
      return res.status(429).json({ error: 'Rate limit hit on Hugging Face! Free calls exhausted for now 😭💀' });
    }

    // Model Warming Up
    if (hfResponse.status === 503) {
      return res.status(503).json({ error: 'Model is warming up on Hugging Face GPU. Wait ~60s and try again!' });
    }

    if (!hfResponse.ok) {
      const errText = await hfResponse.text().catch(() => '');
      return res.status(hfResponse.status).json({ 
        error: `Hugging Face Error (${hfResponse.status}): ${errText || hfResponse.statusText}` 
      });
    }

    const arrayBuffer = await hfResponse.arrayBuffer();
    res.setHeader('Content-Type', 'video/mp4');
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (err) {
    return res.status(500).json({ 
      error: `Network Fetch Error: ${err.message}`,
      cause: err.cause ? String(err.cause) : undefined
    });
  }
}
