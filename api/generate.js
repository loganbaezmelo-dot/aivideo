export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  const HF_TOKEN = process.env.HF_TOKEN;

  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN is missing from Vercel Environment Variables 💀' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const hfResponse = await fetch(
      'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    // Rate Limit Hit
    if (hfResponse.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit reached on Hugging Face! Free tier calls are exhausted for now 😭💀' 
      });
    }

    // Model Still Loading onto HF GPU
    if (hfResponse.status === 503) {
      return res.status(503).json({ 
        error: 'Model is currently warming up on Hugging Face servers. Retry in 60 seconds!' 
      });
    }

    if (!hfResponse.ok) {
      const errData = await hfResponse.json().catch(() => ({}));
      return res.status(hfResponse.status).json({ 
        error: errData.error || `Upstream API returned status ${hfResponse.status}` 
      });
    }

    // Return the raw video binary stream
    const arrayBuffer = await hfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'video/mp4');
    return res.status(200).send(buffer);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error occurred' });
  }
}
