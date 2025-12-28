import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  text,
  integer,
} from "drizzle-orm/pg-core";

// Existing todo table (kept for reference/legacy, but likely can be removed later)
export const todoTable = pgTable("todo", {
  id: uuid("id").primaryKey().defaultRandom(),
  todoText: varchar("todo_text", { length: 255 }).notNull(),
  isDone: boolean("is_done").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(
    () => new Date()
  ),
});

// Users table matching Profile page variables
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  // "CONTINUE WITH CMU ACCOUNT" implies email/studentID
  email: varchar("email", { length: 255 }).unique().notNull(),
  studentId: varchar("student_id", { length: 20 }), // e.g. "65..."

  // Profile stats & info
  faculty: varchar("faculty", { length: 100 }), // e.g. "Engineering"
  major: varchar("major", { length: 100 }),
  year: varchar("year", { length: 10 }), // e.g. "65"

  bio: text("bio"), // "A kind-hearted Demon Slayer..."
  avatarUrl: varchar("avatar_url", { length: 512 }),
  coverUrl: varchar("cover_url", { length: 512 }),

  isVerified: boolean("is_verified").default(false), // Blue tick

  // Counters for profile stats (optional, can be computed but good for caching)
  friendsCount: integer("friends_count").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(
    () => new Date()
  ),
});

// Posts table matching Feeds page variables
export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  content: text("content"), // "I love my family so much!"
  imageUrl: varchar("image_url", { length: 512 }), // Post image

  // "Global", "Friends", "Announcements", etc.
  category: varchar("category", { length: 50 }).default("Global"),

  // Interaction counts visible in UI
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(), // "1 hours ago"
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(
    () => new Date()
  ),
});