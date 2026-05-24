import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProjectTracker } from '@/components/project-tracking/ProjectTracker';

export default function TrackProject() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || undefined;

  return (
    <>
      <Helmet>
        <title>Track Your Project | Wellington EcoBuild</title>
        <meta 
          name="description" 
          content="Track your sustainable building project in real-time. Get live updates on milestones, status changes, and builder communications." 
        />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 py-8 md:py-12">
          <div className="container max-w-3xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Live Project Tracking
              </h1>
              <p className="text-muted-foreground text-lg">
                Stay updated on your sustainable building project with real-time status updates
              </p>
            </div>
            
            <ProjectTracker initialCode={code} />
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
