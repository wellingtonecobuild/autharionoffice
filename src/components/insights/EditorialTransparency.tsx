import { Info } from "lucide-react";

const EditorialTransparency = () => {
  return (
    <div className="mt-12 p-6 bg-muted/50 border border-border rounded-xl">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-foreground mb-2">Editorial Transparency</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This article is an original editorial analysis created for Wellington EcoBuild, based on publicly available information, industry trends, and professional observations within the Wellington construction sector. It does not reproduce proprietary news content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditorialTransparency;