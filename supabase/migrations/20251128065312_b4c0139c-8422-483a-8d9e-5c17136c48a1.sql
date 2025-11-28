-- Create enum for asset types
CREATE TYPE public.asset_type AS ENUM ('PV', 'Wind', 'Battery');

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type asset_type NOT NULL,
  description TEXT,
  total_capacity_kw DECIMAL NOT NULL,
  location TEXT,
  price_per_percent DECIMAL NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_assets table for ownership
CREATE TABLE public.user_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  ownership_percent DECIMAL NOT NULL CHECK (ownership_percent > 0 AND ownership_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  percent_traded DECIMAL NOT NULL CHECK (percent_traded > 0 AND percent_traded <= 100),
  price_per_percent DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assets (public read)
CREATE POLICY "Assets are viewable by everyone"
  ON public.assets FOR SELECT
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_assets
CREATE POLICY "Users can view their own assets"
  ON public.user_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own asset ownership"
  ON public.user_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset ownership"
  ON public.user_assets FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_assets_updated_at
  BEFORE UPDATE ON public.user_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample assets
INSERT INTO public.assets (name, type, description, total_capacity_kw, location, price_per_percent, image_url) VALUES
('Solar Farm Alpha', 'PV', 'Large-scale solar installation with 5000 panels', 2000, 'California, USA', 150, 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800'),
('Wind Turbine Beta', 'Wind', 'Offshore wind farm with 10 turbines', 5000, 'North Sea, UK', 200, 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800'),
('Battery Storage Gamma', 'Battery', 'Grid-scale lithium-ion battery system', 1000, 'Texas, USA', 100, 'https://images.unsplash.com/photo-1620287341056-49a2f1ab2fdc?w=800'),
('Solar Park Delta', 'PV', 'Community solar project serving 500 homes', 1500, 'Arizona, USA', 120, 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800'),
('Wind Farm Epsilon', 'Wind', 'Onshore wind installation with 15 turbines', 7500, 'Scotland, UK', 250, 'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800');
