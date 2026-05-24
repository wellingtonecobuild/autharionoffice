import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, Volume2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const adScripts = [
  {
    id: "list-your-business",
    title: "List Your Business",
    script: "Join Wellington's premier sustainable construction directory. Get verified, get found, grow your business. Wellington EcoBuild — where quality meets visibility.",
    musicPrompt: "Professional corporate background music, inspiring, modern, clean, 10 seconds"
  },
  {
    id: "connect-professionals", 
    title: "Connect with Professionals",
    script: "Find verified builders, architects, and suppliers — all in one place. Wellington EcoBuild connects you with trusted professionals for your next project.",
    musicPrompt: "Uplifting corporate music, trustworthy, professional, warm, 10 seconds"
  },
  {
    id: "sustainability-mission",
    title: "Sustainability Mission",
    script: "Building a greener Wellington, one project at a time. Discover eco-certified professionals committed to sustainable construction. Wellington EcoBuild.",
    musicPrompt: "Gentle inspiring music, nature-inspired, hopeful, environmental theme, 10 seconds"
  },
  {
    id: "verified-experts",
    title: "Verified Experts",
    script: "Every professional manually verified. Every credential checked. Trust the platform that puts quality first. Wellington EcoBuild — verified excellence.",
    musicPrompt: "Confident professional music, trustworthy, premium feel, sophisticated, 10 seconds"
  }
];

interface GeneratedAudio {
  id: string;
  narrationUrl: string | null;
  musicUrl: string | null;
}

const AdminAudioGenerator = () => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);

  const generateAudio = async (ad: typeof adScripts[0]) => {
    setGenerating(ad.id);
    
    try {
      // Generate narration
      toast.info(`Generating narration for "${ad.title}"...`);
      
      const narrationResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ad-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: "narration",
            script: ad.script,
          }),
        }
      );

      if (!narrationResponse.ok) {
        const errorData = await narrationResponse.json();
        throw new Error(errorData.error || "Failed to generate narration");
      }

      const narrationData = await narrationResponse.json();
      const narrationUrl = `data:audio/mpeg;base64,${narrationData.audioContent}`;

      toast.success(`Narration generated for "${ad.title}"!`);

      // Generate music
      toast.info(`Generating music for "${ad.title}"...`);
      
      const musicResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ad-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: "music",
            musicPrompt: ad.musicPrompt,
          }),
        }
      );

      if (!musicResponse.ok) {
        const errorData = await musicResponse.json();
        throw new Error(errorData.error || "Failed to generate music");
      }

      const musicData = await musicResponse.json();
      const musicUrl = `data:audio/mpeg;base64,${musicData.audioContent}`;

      toast.success(`Music generated for "${ad.title}"!`);

      setGeneratedAudios(prev => [
        ...prev.filter(a => a.id !== ad.id),
        { id: ad.id, narrationUrl, musicUrl }
      ]);

    } catch (error) {
      console.error("Audio generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate audio");
    } finally {
      setGenerating(null);
    }
  };

  const downloadAudio = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGeneratedAudio = (id: string) => {
    return generatedAudios.find(a => a.id === id);
  };

  return (
    <AdminLayout title="Audio Generator">
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Generate narration and background music for video ads using ElevenLabs
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {adScripts.map((ad) => {
            const generated = getGeneratedAudio(ad.id);
            const isGenerating = generating === ad.id;

            return (
              <Card key={ad.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    {ad.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    "{ad.script}"
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => generateAudio(ad)}
                    disabled={isGenerating || generating !== null}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Audio"
                    )}
                  </Button>

                  {generated && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Narration:</p>
                        <audio controls className="w-full h-10" src={generated.narrationUrl || undefined} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => downloadAudio(generated.narrationUrl!, `${ad.id}-narration.mp3`)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Narration
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Background Music:</p>
                        <audio controls className="w-full h-10" src={generated.musicUrl || undefined} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => downloadAudio(generated.musicUrl!, `${ad.id}-music.mp3`)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Music
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAudioGenerator;
