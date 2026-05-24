import { Monitor } from "lucide-react";

export const BestExperienceNotice = () => {
  return (
    <div className="p-4 bg-accent/10 border-2 border-accent/30 rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <Monitor className="w-5 h-5 text-accent" />
        </div>
        <p className="text-sm font-medium text-foreground">
          For the best experience, we recommend submitting listings using a laptop or desktop.
        </p>
      </div>
    </div>
  );
};