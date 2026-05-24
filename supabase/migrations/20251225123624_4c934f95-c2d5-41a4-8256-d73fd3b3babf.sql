-- GAMIFICATION SYSTEM

-- User points and levels
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Badges/Achievements
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  points_required INTEGER DEFAULT 0,
  criteria JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Points history/transactions
CREATE TABLE public.points_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- COMMUNITY FORUM

-- Forum categories
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum questions/discussions
CREATE TABLE public.forum_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'open',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  views INTEGER NOT NULL DEFAULT 0,
  upvotes INTEGER NOT NULL DEFAULT 0,
  answer_count INTEGER NOT NULL DEFAULT 0,
  accepted_answer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum answers
CREATE TABLE public.forum_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id),
  content TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum votes
CREATE TABLE public.forum_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES public.forum_answers(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT vote_target CHECK (question_id IS NOT NULL OR answer_id IS NOT NULL)
);

-- HOMEOWNER TOOLS

-- Project estimates
CREATE TABLE public.project_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  project_type TEXT NOT NULL,
  project_size TEXT,
  budget_range TEXT,
  timeline TEXT,
  location TEXT,
  requirements JSONB,
  estimated_cost_low INTEGER,
  estimated_cost_high INTEGER,
  matched_businesses UUID[],
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contractor match requests
CREATE TABLE public.contractor_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID REFERENCES public.project_estimates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  message TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LIVE ACTIVITY TRACKING

-- Site activity feed
CREATE TABLE public.site_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  city TEXT DEFAULT 'Wellington',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User points - users can view all, modify own
CREATE POLICY "Anyone can view user points" ON public.user_points FOR SELECT USING (true);
CREATE POLICY "Users can update own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges - public read
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User badges - public read
CREATE POLICY "Anyone can view user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert user badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Points history - own only
CREATE POLICY "Users can view own points history" ON public.points_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert points history" ON public.points_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Forum categories - public read
CREATE POLICY "Anyone can view forum categories" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage forum categories" ON public.forum_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Forum questions - public read, auth create
CREATE POLICY "Anyone can view forum questions" ON public.forum_questions FOR SELECT USING (true);
CREATE POLICY "Auth users can create questions" ON public.forum_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.forum_questions FOR UPDATE USING (auth.uid() = user_id);

-- Forum answers - public read, auth create
CREATE POLICY "Anyone can view forum answers" ON public.forum_answers FOR SELECT USING (true);
CREATE POLICY "Auth users can create answers" ON public.forum_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own answers" ON public.forum_answers FOR UPDATE USING (auth.uid() = user_id);

-- Forum votes - auth users
CREATE POLICY "Auth users can view votes" ON public.forum_votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can vote" ON public.forum_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.forum_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.forum_votes FOR DELETE USING (auth.uid() = user_id);

-- Project estimates - own or session
CREATE POLICY "Users can view own estimates" ON public.project_estimates FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create estimates" ON public.project_estimates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own estimates" ON public.project_estimates FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Contractor matches
CREATE POLICY "Users can view own matches" ON public.contractor_matches FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create matches" ON public.contractor_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Business owners can view their matches" ON public.contractor_matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id AND owner_id = auth.uid())
);

-- Site activity - public read
CREATE POLICY "Anyone can view site activity" ON public.site_activity FOR SELECT USING (true);
CREATE POLICY "System can insert activity" ON public.site_activity FOR INSERT WITH CHECK (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, points_required, criteria) VALUES
('Early Adopter', 'One of the first members of Wellington EcoBuild', 'star', 'membership', 0, '{"type": "early_adopter"}'),
('First Question', 'Asked your first question in the community', 'help-circle', 'community', 10, '{"type": "first_question"}'),
('Helpful Answer', 'Provided an accepted answer', 'check-circle', 'community', 25, '{"type": "accepted_answer"}'),
('Top Contributor', 'Answered 10+ questions', 'award', 'community', 100, '{"type": "answer_count", "count": 10}'),
('Verified Pro', 'Completed business verification', 'shield-check', 'business', 50, '{"type": "verified_business"}'),
('Elite Member', 'Subscribed to Elite plan', 'crown', 'business', 100, '{"type": "elite_plan"}'),
('Week Streak', 'Active for 7 consecutive days', 'flame', 'engagement', 20, '{"type": "streak", "days": 7}'),
('Month Streak', 'Active for 30 consecutive days', 'flame', 'engagement', 100, '{"type": "streak", "days": 30}'),
('Review Writer', 'Left 5+ reviews', 'message-square', 'engagement', 50, '{"type": "review_count", "count": 5}'),
('Project Planner', 'Created a project estimate', 'calculator', 'homeowner', 15, '{"type": "first_estimate"}');

-- Insert default forum categories
INSERT INTO public.forum_categories (name, slug, description, icon, sort_order) VALUES
('General Discussion', 'general', 'General questions about building and construction', 'message-circle', 1),
('Finding Contractors', 'contractors', 'Help finding the right contractor for your project', 'search', 2),
('Sustainable Building', 'sustainable', 'Eco-friendly building practices and materials', 'leaf', 3),
('Renovations', 'renovations', 'Home renovation questions and advice', 'home', 4),
('Building Regulations', 'regulations', 'NZ building codes and consent questions', 'file-text', 5),
('Cost & Budgeting', 'budgeting', 'Project cost estimates and budgeting advice', 'dollar-sign', 6),
('DIY Tips', 'diy', 'Do-it-yourself projects and tips', 'wrench', 7),
('Pro Tips', 'pro-tips', 'Advice from verified professionals', 'award', 8);

-- Triggers for updated_at
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON public.user_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_forum_questions_updated_at BEFORE UPDATE ON public.forum_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_forum_answers_updated_at BEFORE UPDATE ON public.forum_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_estimates_updated_at BEFORE UPDATE ON public.project_estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update answer count
CREATE OR REPLACE FUNCTION public.update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_questions SET answer_count = GREATEST(0, answer_count - 1) WHERE id = OLD.question_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_answer_count
AFTER INSERT OR DELETE ON public.forum_answers
FOR EACH ROW EXECUTE FUNCTION public.update_question_answer_count();

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_activity;