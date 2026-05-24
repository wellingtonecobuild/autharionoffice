import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  Briefcase
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  icon: React.ReactNode;
  color: string;
}

interface EmailTemplatesProps {
  onSelect: (template: EmailTemplate) => void;
}

const templates: EmailTemplate[] = [
  {
    id: 'quote-followup',
    name: 'Quote Follow-up',
    category: 'Sales',
    subject: 'Following up on your quote request',
    body: `Dear [Client Name],

I hope this email finds you well. I wanted to follow up on the quote I provided for your project on [Date].

I'm available to discuss any questions you may have about the scope of work, timeline, or pricing. Please don't hesitate to reach out if you need any clarifications.

Looking forward to the opportunity to work with you.

Best regards,
[Your Name]`,
    icon: <FileText className="h-4 w-4" />,
    color: 'emerald',
  },
  {
    id: 'project-update',
    name: 'Project Update',
    category: 'Project',
    subject: 'Project Update - [Project Name]',
    body: `Dear [Client Name],

I wanted to provide you with an update on the progress of your project.

Current Status:
- [Milestone 1]: Completed
- [Milestone 2]: In Progress
- [Milestone 3]: Scheduled for [Date]

We are on track to complete the project by [Completion Date]. If you have any questions or would like to schedule a site visit, please let me know.

Best regards,
[Your Name]`,
    icon: <Clock className="h-4 w-4" />,
    color: 'blue',
  },
  {
    id: 'schedule-confirmation',
    name: 'Schedule Confirmation',
    category: 'Scheduling',
    subject: 'Appointment Confirmation - [Date]',
    body: `Dear [Client Name],

This email confirms our appointment scheduled for:

Date: [Date]
Time: [Time]
Location: [Address]

Please ensure someone is available to provide access to the property. If you need to reschedule, please contact me at least 24 hours in advance.

Best regards,
[Your Name]`,
    icon: <Calendar className="h-4 w-4" />,
    color: 'purple',
  },
  {
    id: 'invoice-reminder',
    name: 'Invoice Reminder',
    category: 'Billing',
    subject: 'Invoice Reminder - [Invoice Number]',
    body: `Dear [Client Name],

I hope this message finds you well. I wanted to kindly remind you that invoice [Invoice Number] dated [Date] for $[Amount] is now due.

If you have already made the payment, please disregard this message. If you have any questions about the invoice, please don't hesitate to contact me.

Thank you for your prompt attention to this matter.

Best regards,
[Your Name]`,
    icon: <DollarSign className="h-4 w-4" />,
    color: 'amber',
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    category: 'General',
    subject: 'Thank You for Your Business',
    body: `Dear [Client Name],

Thank you for choosing Wellington EcoBuild for your project. It was a pleasure working with you, and I hope you are satisfied with the completed work.

If you have any questions or need any follow-up services, please don't hesitate to reach out. I would also greatly appreciate it if you could leave a review of your experience.

Thank you again for your trust and support.

Best regards,
[Your Name]`,
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'green',
  },
  {
    id: 'delay-notification',
    name: 'Delay Notification',
    category: 'Project',
    subject: 'Important: Project Timeline Update',
    body: `Dear [Client Name],

I am writing to inform you of an unexpected delay in the project timeline.

Reason for delay: [Reason]
New estimated completion: [Date]

I sincerely apologize for any inconvenience this may cause. We are working diligently to minimize the impact and ensure the highest quality of work.

Please feel free to contact me if you have any concerns.

Best regards,
[Your Name]`,
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'red',
  },
];

export const EmailTemplates = ({ onSelect }: EmailTemplatesProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(templates.map(t => t.category))];
  const filteredTemplates = selectedCategory 
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const handleSelect = (template: EmailTemplate) => {
    onSelect(template);
    setShowDialog(false);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Templates
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Templates</DialogTitle>
          </DialogHeader>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                  onClick={() => handleSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg bg-${template.color}-100 flex items-center justify-center`}>
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-900">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {template.subject}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
