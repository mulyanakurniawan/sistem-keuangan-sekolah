INSERT INTO public.users (id, username, password_hash, nama_lengkap, role, status, created_at, updated_at) VALUES
('usr-admin-1111', 'admin', 'admin', 'Administrator', 'Admin', 'aktif', now(), now()),
('usr-bendahara-2222', 'bendahara', 'bendahara', 'Bendahara', 'Bendahara', 'aktif', now(), now()),
('usr-kepsek-3333', 'kepsek', 'kepsek', 'Kepala Sekolah', 'Kepala Sekolah', 'aktif', now(), now())
ON CONFLICT (id) DO NOTHING;
