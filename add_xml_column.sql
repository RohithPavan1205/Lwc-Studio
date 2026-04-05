-- 1. Add XML content columns to components schema
ALTER TABLE public.components 
ADD COLUMN IF NOT EXISTS xml_content text;

ALTER TABLE public.versions 
ADD COLUMN IF NOT EXISTS xml_content text;

-- 2. Maintain updated_at constraints for robust tracking
CREATE INDEX IF NOT EXISTS idx_components_xml ON public.components USING btree (xml_content);
