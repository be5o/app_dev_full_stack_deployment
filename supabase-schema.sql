-- Run this in your Supabase project: Dashboard → SQL Editor → New query

CREATE TABLE IF NOT EXISTS student (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    roll_number TEXT,
    class TEXT
);

CREATE TABLE IF NOT EXISTS teacher (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT,
    class TEXT
);
