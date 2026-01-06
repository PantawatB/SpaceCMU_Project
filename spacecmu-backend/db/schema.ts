import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  text,
  integer,
  decimal,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums for status/roles
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "banned"]);
export const postStatusEnum = pgEnum("post_status", ["active", "banned"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted", "blocked"]);
export const marketItemStatusEnum = pgEnum("market_item_status", ["available", "sold"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["global", "private"]);
export const notificationTypeEnum = pgEnum("notification_type", ["like", "comment", "friend_request", "other"]);

// --- Users Table ---
// Covers Profile, Settings, Admin User Mgmt
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Account Info
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).unique(), // Added for Admin/Settings
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }), // For auth
  studentId: varchar("student_id", { length: 20 }),

  // Profile Info
  faculty: varchar("faculty", { length: 100 }),
  major: varchar("major", { length: 100 }),
  year: varchar("year", { length: 10 }),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  coverUrl: varchar("cover_url", { length: 512 }),
  isVerified: boolean("is_verified").default(false),

  // Stats
  friendsCount: integer("friends_count").default(0),

  // Admin & Status
  role: userRoleEnum("role").default("user"),
  status: userStatusEnum("status").default("active"),
  lastActiveAt: timestamp("last_active_at"),

  // Settings (JSON for flexibility)
  // Notifications: { email: bool, push: bool, sms: bool }
  notificationSettings: jsonb("notification_settings").default({ email: true, push: true, sms: false }),
  // Privacy: { profileVisible: bool, showEmail: bool, allowMessages: bool }
  privacySettings: jsonb("privacy_settings").default({ profileVisible: true, showEmail: false, allowMessages: true }),

  theme: varchar("theme", { length: 20 }).default("light"), // light, dark, auto
  language: varchar("language", { length: 20 }).default("en"), // en, th, etc.

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Posts Table ---
// Covers Feeds, Admin Post Mgmt
export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  content: text("content"),
  imageUrl: varchar("image_url", { length: 512 }),
  category: varchar("category", { length: 50 }).default("Global"), // Global, Friends, Announcements, etc.

  // Engagement
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  reportCount: integer("report_count").default(0), // For Admin

  status: postStatusEnum("status").default("active"), // For Admin ban

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Market Categories Table ---
export const marketCategoriesTable = pgTable("market_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).unique().notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Market Items Table ---
// Covers Market Page
export const marketItemsTable = pgTable("market_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => marketCategoriesTable.id),
  sellerId: uuid("seller_id").references(() => usersTable.id).notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"), // "jobTitle" in frontend
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Storable money value
  imageUrl: varchar("image_url", { length: 512 }),

  status: marketItemStatusEnum("status").default("available"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Friendships Table ---
// Covers Friends Page
export const friendshipsTable = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId1: uuid("user_id_1").references(() => usersTable.id).notNull(), // Initiator
  userId2: uuid("user_id_2").references(() => usersTable.id).notNull(), // Receiver

  status: friendshipStatusEnum("status").default("pending"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Messages Table ---
// Covers Chatbox
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").references(() => usersTable.id).notNull(),
  receiverId: uuid("receiver_id").references(() => usersTable.id).notNull(),

  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Calendar Events Table ---
// Covers Calendar Page
export const calendarEventsTable = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),

  type: varchar("type", { length: 50 }).default("event"), // class, activity, appointment

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Announcements Table ---
// Covers Admin Announcement System
export const announcementsTable = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").references(() => usersTable.id).notNull(), // Admin

  content: text("content").notNull(),
  type: announcementTypeEnum("type").default("global"),
  targetUserId: uuid("target_user_id").references(() => usersTable.id), // If private

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Activities / Audit Log Table ---
// Covers Admin Activity Log
export const activitiesTable = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  action: varchar("action", { length: 255 }).notNull(), // "Created a post", "Reported a post"
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Comments Table ---
export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => postsTable.id).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Likes Table ---
export const likesTable = pgTable("likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => postsTable.id).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: {
    name: 'unique_user_post_like',
    columns: [t.userId, t.postId],
    unique: true
  }
}));

// --- Saved Posts Table ---
export const savedPostsTable = pgTable("saved_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  postId: uuid("post_id").references(() => postsTable.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Notifications Table ---
export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").references(() => usersTable.id).notNull(),
  senderId: uuid("sender_id").references(() => usersTable.id),

  type: notificationTypeEnum("type").notNull(),
  referenceId: uuid("reference_id"),

  isRead: boolean("is_read").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});