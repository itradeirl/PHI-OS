// Converts brief text to speech via ElevenLabs, server-side — the API key
// never reaches the browser. Default voice: "Marcos" (Warm, Direct and
// Professional). Change MARCOS_VOICE_ID below to switch voices.

import { requireAuth } from "../lib/auth.js";

const VOICE_ID = "MjDkeH2x9hCiWKXZtUPc"; // Marcos
const MODEL_ID = "eleven_flash_v2_5"; // cheaper/faster tier, good quality

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not set on the server." });
    return;
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing 'text' in request body." });
    return;
  }

  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      res.status(elevenRes.status).json({ error: "ElevenLabs error: " + errText });
      return;
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(500).json({ error: "Speech generation failed: " + err.message });
  }
}
