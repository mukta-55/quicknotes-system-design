# QuickNotes Data Model

This document describes the database that the real QuickNotes backend should use. It has four tables: users, notes, tags and note_tags.

## Entities

### users

One row per person with an account.

| Column     | Type    | Notes                   |
| ---------- | ------- | ----------------------- |
| id         | INTEGER | Primary key             |
| name       | TEXT    | Required                |
| email      | TEXT    | Required, unique        |
| created_at | TEXT    | Filled in automatically |

### notes

One row per note.

| Column     | Type    | Notes                              |
| ---------- | ------- | ---------------------------------- |
| id         | INTEGER | Primary key                        |
| user_id    | INTEGER | Foreign key to users(id), required |
| text       | TEXT    | Required, at most 200 characters   |
| category   | TEXT    | Required, default 'personal'       |
| created_at | TEXT    | Filled in automatically            |

### tags

One row per tag name, so each tag is stored once.

| Column | Type    | Notes            |
| ------ | ------- | ---------------- |
| id     | INTEGER | Primary key      |
| name   | TEXT    | Required, unique |

### note_tags

The join table that links notes and tags.

| Column  | Type    | Notes                    |
| ------- | ------- | ------------------------ |
| note_id | INTEGER | Foreign key to notes(id) |
| tag_id  | INTEGER | Foreign key to tags(id)  |

The primary key is the pair (note_id, tag_id). It is a composite primary key, so the same tag cannot be attached to the same note twice.

## Relationships

- **One-to-many (users and notes):** one user has many notes, and each note belongs to exactly one user. The `notes.user_id` foreign key points to `users.id`.
- **Many-to-many (notes and tags):** a note can have many tags, and a tag can be on many notes. A single column cannot hold many values, so a third table, `note_tags`, stores one row for each pair of a note id and a tag id. Both of its columns are foreign keys.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  text       TEXT NOT NULL CHECK (length(text) <= 200),
  category   TEXT NOT NULL DEFAULT 'personal',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

`ON DELETE CASCADE` means that deleting a user also deletes that user's notes, and deleting a note also removes its tag links. SQLite enforces foreign keys only after `PRAGMA foreign_keys = ON;`. PostgreSQL and MySQL enforce them automatically.

## Example queries

```sql
-- 1. All notes of user 1, newest first
SELECT * FROM notes WHERE user_id = 1 ORDER BY created_at DESC;

-- 2. Each note together with its author's name (uses a JOIN)
SELECT notes.text, notes.category, users.name
FROM notes
JOIN users ON notes.user_id = users.id
ORDER BY users.name;

-- 3. All notes tagged "urgent" (two JOINs through the join table)
SELECT notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent';
```

## Index

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
```

The most common request is "list this user's notes" (`GET /notes`), which becomes `SELECT * FROM notes WHERE user_id = ?`. Without an index the database must check every row in the notes table. With an index on `user_id`, it jumps straight to that user's rows. At 1 million users and millions of notes, this is the difference between a fast request and a slow one. The cost is that every insert, update or delete must also update the index, and the index uses extra storage, which is a fair trade for a column we search on every read.

## SQL or NoSQL?

I chose SQL (a relational database such as PostgreSQL). QuickNotes data is clearly structured, with users, notes and tags that follow fixed columns, and it has real relationships: one user has many notes, and notes and tags are many-to-many. SQL handles these with foreign keys and JOINs, and the database itself enforces rules such as a unique email and the 200-character limit, so the data stays correct even when the application code has a bug. A document database could suit data that changes shape often or needs to spread across very many servers, but QuickNotes needs neither, and its read-heavy traffic can be handled with caching and read replicas.
