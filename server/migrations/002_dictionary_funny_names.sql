-- Noms marrants réservés à un dictionnaire (ex. ceux du discours présidentiel).
-- dictionary_id NULL = liste générale, utilisée par tous les dictionnaires.

ALTER TABLE funny_names
	ADD COLUMN dictionary_id uuid REFERENCES dictionaries (id) ON DELETE CASCADE;

-- Unicité par liste (générale ou d'un dictionnaire) au lieu d'une unicité globale.
ALTER TABLE funny_names DROP CONSTRAINT funny_names_name_key;
CREATE UNIQUE INDEX funny_names_list_name_idx
	ON funny_names (COALESCE(dictionary_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
