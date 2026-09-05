export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body || {};
  const HF_TOKEN = process.env.HF_TOKEN;

  if (!HF_TOKEN) {
    console.error("CRITICAL: HF_TOKEN is undefined in process.env!");
    return res.status(500).json({ error: 'HF_TOKEN environment variable is missing in Vercel!' });
  }

  try {
    // Testing HF connection
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

    const status = hfResponse.status;
    console.log("HF Response Status:", status);

    if (status === 429) {
      return res.status(429).json({ error: 'Rate limit hit on Hugging Face 😭' });
    }

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error("HF Error Body:", errText);
      return res.status(status).json({ error: `Hugging Face error (${status}): ${errText}` });
    }

    const arrayBuffer = await hfResponse.arrayBuffer();
    res.setHeader('Content-Type', 'video/mp4');
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (err) {
    console.error("FETCH FAILED ERROR DETAILS:", err);
    return res.status(500).json({ 
      error: `Internal Fetch Failed: ${err.message}`, 
      cause: err.cause ? String(err.cause) : undefined 
    });
  }
}
