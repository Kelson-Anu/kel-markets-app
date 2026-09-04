CREATE POLICY "Admins can upload market images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update market images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read market images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete market images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));