-- Manual migration for chat rooms only
-- Run this if the full migration fails due to existing tables

-- Create room_member_role enum if not exists
DO $$ BEGIN
    CREATE TYPE room_member_role AS ENUM('member', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name varchar(255),
    avatar_url varchar(512),
    is_group boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp(3)
);

-- Create chat_room_members table
CREATE TABLE IF NOT EXISTS chat_room_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role room_member_role DEFAULT 'member',
    joined_at timestamp DEFAULT now() NOT NULL,
    last_read_at timestamp,
    CONSTRAINT unique_room_user UNIQUE (room_id, user_id)
);

-- Add room_id to messages table if not exists
DO $$ BEGIN
    ALTER TABLE messages ADD COLUMN room_id uuid;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Make receiver_id nullable if not already
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Add other message columns if not exists
DO $$ BEGIN
    ALTER TABLE messages ADD COLUMN edited_at timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE messages ADD COLUMN deleted_at timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE chat_room_members 
        ADD CONSTRAINT chat_room_members_room_id_chat_rooms_id_fk 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE chat_room_members 
        ADD CONSTRAINT chat_room_members_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE chat_rooms 
        ADD CONSTRAINT chat_rooms_created_by_users_id_fk 
        FOREIGN KEY (created_by) REFERENCES users(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE messages 
        ADD CONSTRAINT messages_room_id_chat_rooms_id_fk 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
