import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, script, musicPrompt } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log(`Generating ${type} audio...`);

    if (type === 'narration') {
      // Using "George" voice - professional British/NZ-adjacent accent
      // Voice ID: JBFqnCBsd6RMkjVDRZzb
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: script,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.85,
              style: 0.4,
              use_speaker_boost: true,
              speed: 0.95, // Slightly slower for professional tone
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs TTS error:', errorText);
        throw new Error(`TTS generation failed: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      console.log('Narration generated successfully');

      return new Response(
        JSON.stringify({ audioContent: base64Audio, type: 'narration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'music') {
      const response = await fetch(
        'https://api.elevenlabs.io/v1/music',
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: musicPrompt,
            duration_seconds: 12, // Slightly longer than video for fade out
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs Music error:', errorText);
        throw new Error(`Music generation failed: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      console.log('Music generated successfully');

      return new Response(
        JSON.stringify({ audioContent: base64Audio, type: 'music' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid type. Must be "narration" or "music"');

  } catch (error) {
    console.error('Error in generate-ad-audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
