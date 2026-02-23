-- ============================================================
-- Migration: Fix Timezone
-- ปัญหา: ข้อมูลเก่าถูกบันทึกเป็น Asia/Bangkok แต่ column
--        เป็น "timestamp WITHOUT time zone" ทำให้ไม่มี offset
--        เมื่อ backend ย้ายเป็น UTC แล้ว frontend แสดงเวลาผิด 7 ชั่วโมง
--
-- สิ่งที่ migration นี้ทำ:
--   1. แปลงข้อมูลเก่าทุกแถว: ลบ 7 ชั่วโมง (คืนค่า UTC ที่ถูกต้อง)
--   2. เปลี่ยน column type เป็น TIMESTAMPTZ (timestamp WITH time zone)
--      เพื่อป้องกันปัญหาซ้ำในอนาคต
-- ============================================================

BEGIN;

-- ─── STEP 1: แปลงข้อมูลเก่า Bangkok → UTC (ลบ 7 ชั่วโมง) ────────────────────

UPDATE messages        SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE messages        SET edited_at  = edited_at  - INTERVAL '7 hours' WHERE edited_at  IS NOT NULL;
UPDATE messages        SET deleted_at = deleted_at - INTERVAL '7 hours' WHERE deleted_at IS NOT NULL;

UPDATE chat_rooms      SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE chat_rooms      SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;

UPDATE chat_room_members SET joined_at    = joined_at    - INTERVAL '7 hours' WHERE joined_at    IS NOT NULL;
UPDATE chat_room_members SET last_read_at = last_read_at - INTERVAL '7 hours' WHERE last_read_at IS NOT NULL;

UPDATE posts           SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE posts           SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;

UPDATE event_posts     SET created_at       = created_at       - INTERVAL '7 hours' WHERE created_at       IS NOT NULL;
UPDATE event_posts     SET updated_at       = updated_at       - INTERVAL '7 hours' WHERE updated_at       IS NOT NULL;
UPDATE event_posts     SET event_start_time = event_start_time - INTERVAL '7 hours' WHERE event_start_time IS NOT NULL;
UPDATE event_posts     SET event_end_time   = event_end_time   - INTERVAL '7 hours' WHERE event_end_time   IS NOT NULL;

UPDATE comments        SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE comments        SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;

UPDATE comment_media   SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE post_media      SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;

UPDATE likes           SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE reposts         SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE saved_posts     SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;

UPDATE friendships     SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE friendships     SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;

UPDATE notifications   SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE activities      SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE announcements   SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;

UPDATE calendar_events SET created_at  = created_at  - INTERVAL '7 hours' WHERE created_at  IS NOT NULL;
UPDATE calendar_events SET updated_at  = updated_at  - INTERVAL '7 hours' WHERE updated_at  IS NOT NULL;
UPDATE calendar_events SET start_time  = start_time  - INTERVAL '7 hours' WHERE start_time  IS NOT NULL;
UPDATE calendar_events SET end_time    = end_time    - INTERVAL '7 hours' WHERE end_time    IS NOT NULL;

UPDATE market_items    SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE market_items    SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;
UPDATE market_categories SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;

UPDATE official_accounts SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;
UPDATE official_accounts SET updated_at = updated_at - INTERVAL '7 hours' WHERE updated_at IS NOT NULL;
UPDATE official_account_admins SET granted_at = granted_at - INTERVAL '7 hours' WHERE granted_at IS NOT NULL;

UPDATE users           SET created_at    = created_at    - INTERVAL '7 hours' WHERE created_at    IS NOT NULL;
UPDATE users           SET updated_at    = updated_at    - INTERVAL '7 hours' WHERE updated_at    IS NOT NULL;
UPDATE users           SET last_active_at = last_active_at - INTERVAL '7 hours' WHERE last_active_at IS NOT NULL;

UPDATE sessions        SET created_at = created_at - INTERVAL '7 hours' WHERE created_at IS NOT NULL;

-- ─── STEP 2: เปลี่ยน column type เป็น TIMESTAMPTZ ───────────────────────────
-- (AT TIME ZONE 'UTC' บอก Postgres ว่าค่าที่มีอยู่คือ UTC)

ALTER TABLE messages
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN edited_at  TYPE TIMESTAMPTZ USING edited_at  AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING deleted_at AT TIME ZONE 'UTC';

ALTER TABLE chat_rooms
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE chat_room_members
  ALTER COLUMN joined_at    TYPE TIMESTAMPTZ USING joined_at    AT TIME ZONE 'UTC',
  ALTER COLUMN last_read_at TYPE TIMESTAMPTZ USING last_read_at AT TIME ZONE 'UTC';

ALTER TABLE posts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE event_posts
  ALTER COLUMN created_at       TYPE TIMESTAMPTZ USING created_at       AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at       TYPE TIMESTAMPTZ USING updated_at       AT TIME ZONE 'UTC',
  ALTER COLUMN event_start_time TYPE TIMESTAMPTZ USING event_start_time AT TIME ZONE 'UTC',
  ALTER COLUMN event_end_time   TYPE TIMESTAMPTZ USING event_end_time   AT TIME ZONE 'UTC';

ALTER TABLE comments
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE comment_media
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE post_media
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE likes
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE reposts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE saved_posts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE friendships
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE notifications
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE activities
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE announcements
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE calendar_events
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC',
  ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'UTC',
  ALTER COLUMN end_time   TYPE TIMESTAMPTZ USING end_time   AT TIME ZONE 'UTC';

ALTER TABLE market_items
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE market_categories
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE official_accounts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE official_account_admins
  ALTER COLUMN granted_at TYPE TIMESTAMPTZ USING granted_at AT TIME ZONE 'UTC';

ALTER TABLE users
  ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at     TYPE TIMESTAMPTZ USING updated_at     AT TIME ZONE 'UTC',
  ALTER COLUMN last_active_at TYPE TIMESTAMPTZ USING last_active_at AT TIME ZONE 'UTC';

ALTER TABLE sessions
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ─── STEP 3: ตั้ง DEFAULT ให้ใหม่ใช้ now() (UTC) ──────────────────────────
ALTER TABLE messages         ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE chat_rooms       ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE chat_rooms       ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE chat_room_members ALTER COLUMN joined_at SET DEFAULT now();
ALTER TABLE posts            ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE posts            ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE comments         ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE likes            ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE friendships      ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users            ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users            ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE sessions         ALTER COLUMN created_at SET DEFAULT now();

COMMIT;

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT 
  'messages' as tbl,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM messages
UNION ALL
SELECT 
  'users',
  MIN(created_at),
  MAX(created_at)
FROM users;
