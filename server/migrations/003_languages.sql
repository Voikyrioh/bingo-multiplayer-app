-- Langues : les dictionnaires (et donc les salons) sont étiquetés par langue
-- pour filtrer les listes ; les messages système portent une clé traduite par
-- chaque client au lieu d'un texte en français.

-- Code ISO 639-1 (fr, en, de…), validé par l'application (shared/languages.ts).
-- Tout ce qui existe déjà est en français.
ALTER TABLE dictionaries ADD COLUMN language text NOT NULL DEFAULT 'fr';
CREATE INDEX dictionaries_language_idx ON dictionaries (language) WHERE is_public OR featured;

-- Messages système et annonces : clé (namespace feed. du client) + paramètres.
-- Les anciens messages gardent leur texte (key NULL).
ALTER TABLE messages ADD COLUMN key text;
ALTER TABLE messages ADD COLUMN params jsonb;
