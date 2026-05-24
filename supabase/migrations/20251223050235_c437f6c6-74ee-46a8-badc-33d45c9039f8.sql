-- Create A/B test configurations table
CREATE TABLE public.ad_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variant_a JSONB NOT NULL DEFAULT '{"position": "after_first_paragraph", "format": "horizontal"}',
  variant_b JSONB NOT NULL DEFAULT '{"position": "mid_article", "format": "horizontal"}',
  traffic_split INTEGER NOT NULL DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create A/B test results table for tracking impressions and clicks
CREATE TABLE public.ad_ab_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.ad_ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_id, variant, date)
);

-- Enable RLS
ALTER TABLE public.ad_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ab_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for ad_ab_tests
CREATE POLICY "Admins can manage A/B tests" 
ON public.ad_ab_tests 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view running tests" 
ON public.ad_ab_tests 
FOR SELECT
USING (status = 'running');

-- RLS policies for ad_ab_test_results
CREATE POLICY "Admins can manage A/B test results" 
ON public.ad_ab_test_results 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert results" 
ON public.ad_ab_test_results 
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view results" 
ON public.ad_ab_test_results 
FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX idx_ab_test_results_test_date ON public.ad_ab_test_results(test_id, date);
CREATE INDEX idx_ab_tests_status ON public.ad_ab_tests(status);

-- Add updated_at trigger
CREATE TRIGGER update_ad_ab_tests_updated_at
BEFORE UPDATE ON public.ad_ab_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();