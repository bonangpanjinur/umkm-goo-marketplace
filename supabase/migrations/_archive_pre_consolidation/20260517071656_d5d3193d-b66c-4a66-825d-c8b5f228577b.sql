-- Tambah role staff multi-UMKM dan perbaiki accept_staff_invitation
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pelayan';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gudang';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'koki';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'helper';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor';