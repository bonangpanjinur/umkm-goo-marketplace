SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

INSERT INTO public.icd10_codes VALUES ('J00', 'Nasofaringitis akut (common cold)', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J02.9', 'Faringitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J03.9', 'Tonsilitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J06.9', 'Infeksi saluran napas atas akut', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J11', 'Influenza, virus tidak teridentifikasi', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J20.9', 'Bronkitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J45.9', 'Asma, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A09', 'Diare & gastroenteritis (dugaan infeksi)', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K29.7', 'Gastritis, tidak spesifik', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('K30', 'Dispepsia fungsional', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('K59.0', 'Konstipasi', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('B34.9', 'Infeksi virus, tidak spesifik', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A01.0', 'Demam tifoid', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A91', 'Demam berdarah dengue (DBD)', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('B54', 'Malaria, tidak spesifik', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A15.0', 'TB paru, dengan konfirmasi bakteriologis', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R50.9', 'Demam, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R51', 'Sefalgia (sakit kepala)', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R10.4', 'Nyeri perut, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R11', 'Mual & muntah', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R05', 'Batuk', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R07.4', 'Nyeri dada, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R42', 'Pusing & vertigo', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('I10', 'Hipertensi esensial', 'Kardiovaskular') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('I20.9', 'Angina pektoris, tidak spesifik', 'Kardiovaskular') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E11.9', 'Diabetes melitus tipe 2, tanpa komplikasi', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E78.5', 'Hiperlipidemia, tidak spesifik', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E03.9', 'Hipotiroidisme, tidak spesifik', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('N39.0', 'Infeksi saluran kemih, lokasi tidak spesifik', 'Urogenital') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('N76.0', 'Vaginitis akut', 'Urogenital') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L20.9', 'Dermatitis atopik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L30.9', 'Dermatitis, tidak spesifik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L50.9', 'Urtikaria, tidak spesifik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L08.9', 'Infeksi kulit dan jaringan lunak', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M54.5', 'Low back pain', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M25.5', 'Nyeri sendi', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M79.1', 'Mialgia', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H10.9', 'Konjungtivitis, tidak spesifik', 'THT/Mata') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H66.9', 'Otitis media, tidak spesifik', 'THT/Mata') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H81.1', 'Vertigo paroksismal jinak (BPPV)', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('Z00.0', 'Pemeriksaan kesehatan umum', 'Preventif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('Z23', 'Imunisasi', 'Preventif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('F41.1', 'Gangguan cemas menyeluruh', 'Psikiatri') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('F32.9', 'Episode depresi, tidak spesifik', 'Psikiatri') ON CONFLICT DO NOTHING;


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wallet_topup_presets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--
