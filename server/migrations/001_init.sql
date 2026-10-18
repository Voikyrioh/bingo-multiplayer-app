-- Schéma initial du bingo. Appliqué au démarrage (src/infrastructure/postgres/migrate.ts).

CREATE TABLE dictionaries (
	id          uuid PRIMARY KEY,
	code        text NOT NULL UNIQUE,
	title       text NOT NULL,
	description text NOT NULL DEFAULT '',
	entries     jsonb NOT NULL,
	free_space  text,
	is_public   boolean NOT NULL DEFAULT false,
	featured    boolean NOT NULL DEFAULT false,
	created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dictionaries_listed_idx ON dictionaries (featured DESC, created_at DESC)
	WHERE is_public OR featured;

CREATE TABLE funny_names (
	id   serial PRIMARY KEY,
	name text NOT NULL UNIQUE
);

CREATE TABLE rooms (
	id               uuid PRIMARY KEY,
	code             text NOT NULL UNIQUE,
	name             text NOT NULL,
	mode             text NOT NULL CHECK (mode IN ('multi', 'solo')),
	visibility       text NOT NULL CHECK (visibility IN ('public', 'unlisted')),
	password_hash    text,
	dictionary_id    uuid NOT NULL REFERENCES dictionaries (id),
	grid_size        smallint NOT NULL CHECK (grid_size BETWEEN 3 AND 5),
	free_center      boolean NOT NULL,
	owner_id         uuid,
	created_at       timestamptz NOT NULL,
	last_activity_at timestamptz NOT NULL,
	closed_at        timestamptz
);

CREATE INDEX rooms_open_idx ON rooms (last_activity_at) WHERE closed_at IS NULL;
CREATE INDEX rooms_closed_idx ON rooms (closed_at) WHERE closed_at IS NOT NULL;

CREATE TABLE participants (
	id              uuid PRIMARY KEY,
	room_id         uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
	name            text NOT NULL,
	role            text NOT NULL CHECK (role IN ('player', 'spectator')),
	token_hash      text NOT NULL UNIQUE,
	cells           jsonb,
	checked         jsonb NOT NULL DEFAULT '[]',
	announced_lines jsonb NOT NULL DEFAULT '[]',
	full_at         timestamptz,
	joined_at       timestamptz NOT NULL
);

CREATE INDEX participants_room_idx ON participants (room_id, joined_at);

CREATE TABLE messages (
	id           bigserial PRIMARY KEY,
	room_id      uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
	kind         text NOT NULL CHECK (kind IN ('chat', 'system', 'announce')),
	author_id    uuid,
	author_name  text,
	text         text NOT NULL,
	announcement text CHECK (announcement IN ('line', 'diagonal', 'full')),
	created_at   timestamptz NOT NULL
);

CREATE INDEX messages_room_idx ON messages (room_id, id DESC);
