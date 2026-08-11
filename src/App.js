-- Table de configuration d affichage des pastilles (globale, une seule ligne id=main)
create table if not exists config_affichage (
  id text primary key,
  pastille_size int,
  label_color text,
  label_size int,
  cercle_size int,
  cercle_color text
);
-- Coherent avec les autres tables du portail (acces sans RLS)
alter table config_affichage disable row level security;
