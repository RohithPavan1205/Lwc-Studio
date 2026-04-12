-- Migration: Add missing columns to salesforce_connections table

-- Add org_id column if it doesn't exist
ALTER TABLE public.salesforce_connections
ADD COLUMN IF NOT EXISTS org_id text;

-- Add sf_user_id column if it doesn't exist
ALTER TABLE public.salesforce_connections
ADD COLUMN IF NOT EXISTS sf_user_id text;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.salesforce_connections
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_salesforce_connections_org_id ON public.salesforce_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_salesforce_connections_sf_user_id ON public.salesforce_connections(sf_user_id);
