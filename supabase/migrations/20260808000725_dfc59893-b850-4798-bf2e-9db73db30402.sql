CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.markets (
  id text PRIMARY KEY,
  question text NOT NULL,
  category text NOT NULL DEFAULT 'Politics',
  description text NOT NULL DEFAULT '',
  yes_price numeric NOT NULL DEFAULT 0.5,
  change_24h numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  liquidity numeric NOT NULL DEFAULT 0,
  closes text NOT NULL DEFAULT '',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  resolution text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT markets_status_check CHECK (status IN ('draft','published')),
  CONSTRAINT markets_resolution_check CHECK (resolution IS NULL OR resolution IN ('YES','NO'))
);

GRANT SELECT ON public.markets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published markets"
ON public.markets FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Admins can view all markets"
ON public.markets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert markets"
ON public.markets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update markets"
ON public.markets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete markets"
ON public.markets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER markets_set_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.markets (id, question, category, description, yes_price, change_24h, volume, liquidity, closes, history, status) VALUES
('btc-150k-2026','Will Bitcoin close above $150,000 before 2027?','Crypto','Resolves YES if the daily close of BTC/USD on the reference index exceeds $150,000 at any point before Jan 1, 2027.',0.62,4.1,18420000,2310000,'Dec 31, 2026','[0.656,0.645,0.646,0.636,0.606,0.638,0.66,0.659,0.681,0.669,0.653,0.668,0.681,0.652,0.64,0.614,0.588,0.601,0.599,0.632,0.603,0.625,0.642,0.676,0.655,0.644,0.664,0.62]','published'),
('fed-cut-september','Will the Fed cut rates at the September meeting?','Economy','Resolves YES if the FOMC announces a reduction of the federal funds target range at its September meeting.',0.38,-6.4,9240000,1120000,'Sep 18, 2026','[0.389,0.411,0.413,0.395,0.379,0.342,0.342,0.303,0.333,0.313,0.336,0.349,0.335,0.355,0.337,0.364,0.334,0.362,0.344,0.347,0.328,0.342,0.34,0.358,0.37,0.351,0.329,0.38]','published'),
('gpt6-release','Will a frontier lab ship a model called GPT-6 this year?','Tech','Resolves YES on a public release announcement of a model branded GPT-6.',0.21,1.8,3810000,640000,'Dec 31, 2026','[0.184,0.213,0.219,0.216,0.184,0.21,0.227,0.261,0.238,0.22,0.246,0.269,0.303,0.322,0.337,0.366,0.393,0.409,0.389,0.377,0.363,0.333,0.359,0.364,0.334,0.344,0.323,0.21]','published'),
('champions-league-final','Will Real Madrid reach the Champions League final?','Sports','Resolves YES if Real Madrid is one of the two clubs in the 2026/27 final.',0.44,2.6,6120000,880000,'May 30, 2027','[0.407,0.391,0.372,0.345,0.359,0.355,0.349,0.328,0.31,0.325,0.3,0.274,0.28,0.262,0.274,0.298,0.27,0.298,0.29,0.31,0.318,0.32,0.35,0.34,0.377,0.386,0.378,0.44]','published'),
('eu-ai-act-delay','Will the EU delay enforcement of the AI Act?','Politics','Resolves YES if a formal delay to enforcement deadlines is adopted.',0.55,-1.2,2240000,410000,'Nov 1, 2026','[0.532,0.558,0.533,0.51,0.502,0.506,0.491,0.479,0.495,0.464,0.428,0.452,0.432,0.437,0.461,0.464,0.47,0.461,0.459,0.459,0.451,0.416,0.447,0.462,0.494,0.497,0.499,0.55]','published'),
('eth-flip-btc','Will ETH market cap exceed BTC before 2028?','Crypto','Resolves YES if ETH total market cap exceeds BTC for any full UTC day.',0.08,-0.4,1470000,290000,'Dec 31, 2027','[0.051,0.03,0.03,0.032,0.039,0.073,0.059,0.046,0.03,0.03,0.03,0.05,0.048,0.079,0.054,0.063,0.068,0.088,0.112,0.108,0.103,0.112,0.098,0.071,0.057,0.077,0.065,0.08]','published'),
('album-of-the-year','Will a debut artist win Album of the Year?','Culture','Resolves YES if the winning artist has no prior full-length studio album.',0.17,3.3,940000,180000,'Feb 8, 2027','[0.177,0.189,0.204,0.236,0.262,0.257,0.28,0.306,0.293,0.265,0.266,0.246,0.251,0.242,0.266,0.258,0.227,0.255,0.274,0.292,0.271,0.252,0.277,0.293,0.274,0.255,0.26,0.17]','published'),
('spacex-mars-window','Will SpaceX launch an uncrewed Starship to Mars in the next window?','Tech','Resolves YES on a confirmed trans-Mars injection burn during the window.',0.29,7.9,5320000,720000,'Jan 15, 2027','[0.273,0.267,0.28,0.28,0.297,0.289,0.295,0.274,0.304,0.319,0.33,0.33,0.314,0.322,0.327,0.313,0.319,0.316,0.308,0.303,0.334,0.371,0.362,0.376,0.4,0.39,0.392,0.29]','published'),
('uk-election-called','Will a UK general election be called before July?','Politics','Resolves YES if Parliament is dissolved for a general election before July 1.',0.34,-3.1,3980000,530000,'Jul 1, 2027','[0.312,0.32,0.302,0.321,0.286,0.3,0.323,0.318,0.347,0.316,0.302,0.277,0.282,0.298,0.304,0.329,0.303,0.327,0.314,0.285,0.284,0.313,0.325,0.338,0.323,0.331,0.361,0.34]','published');