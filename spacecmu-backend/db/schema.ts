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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "banned"]);
export const postStatusEnum = pgEnum("post_status", ["active", "banned"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted", "blocked"]);
export const marketItemStatusEnum = pgEnum("market_item_status", ["available", "sold"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["global", "private"]);
export const notificationTypeEnum = pgEnum("notification_type", ["like", "comment", "friend_request", "other"]);
export const roomMemberRoleEnum = pgEnum("room_member_role", ["member", "admin"]);

// --- Users Table ---
// Covers Profile, Settings, Admin User Mgmt
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Account Info
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).unique(), // Added for Admin/Settings
  email: varchar("email", { length: 255 }).unique().notNull(),
  studentId: varchar("student_id", { length: 20 }),

  // Profile Info
  faculty: varchar("faculty", { length: 100 }),
  major: varchar("major", { length: 100 }),
  year: varchar("year", { length: 10 }),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  bannerUrl: varchar("banner_url", { length: 512 }),

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

  // Dual Account System
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  parentUserId: uuid("parent_user_id").references((): AnyPgColumn => usersTable.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Posts Table ---
// Covers Feeds, Admin Post Mgmt
export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  content: text("content"),
  imageUrl: varchar("image_url", { length: 512 }), // Deprecated, kept for migration safety
  mediaUrl: varchar("media_url", { length: 512 }),
  mediaType: varchar("media_type", { length: 20 }).default("image"), // image, video
  category: varchar("category", { length: 50 }).default("Global"), // Global, Friends, Announcements, etc.

  // Engagement
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  repostCount: integer("repost_count").default(0),

  status: postStatusEnum("status").default("active"), // For Admin ban

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Post Media Table ---
// Supports multiple images/videos per post
export const postMediaTable = pgTable("post_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),

  mediaUrl: varchar("media_url", { length: 512 }).notNull(),
  mediaType: varchar("media_type", { length: 20 }).notNull(), // image, video
  order: integer("order").default(0).notNull(), // Display order

  // Optional metadata
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // For videos (seconds)
  fileSize: integer("file_size"), // In bytes

  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// --- Chat Rooms Table ---
// Supports both 1-on-1 and group chats
export const chatRoomsTable = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 255 }), // For group chats, null for 1-on-1
  avatarUrl: varchar("avatar_url", { length: 512 }), // For group chats
  isGroup: boolean("is_group").default(false).notNull(), // false = 1-on-1, true = group

  createdBy: uuid("created_by").references(() => usersTable.id).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Chat Room Members Table ---
// Tracks membership in chat rooms
export const chatRoomMembersTable = pgTable("chat_room_members", {
  id: uuid("id").primaryKey().defaultRandom(),

  roomId: uuid("room_id").references(() => chatRoomsTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  role: roomMemberRoleEnum("role").default("member"), // For group chats: member or admin

  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"), // Track read status per user
}, (t) => ({
  unq: {
    name: 'unique_room_user',
    columns: [t.roomId, t.userId],
    unique: true
  }
}));

// --- Messages Table ---
// Covers Chatbox - now room-based
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),

  roomId: uuid("room_id").references(() => chatRoomsTable.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => usersTable.id).notNull(),
  receiverId: uuid("receiver_id").references(() => usersTable.id), // Deprecated, kept for backward compatibility

  content: text("content").notNull(),
  isRead: boolean("is_read").default(false), // Deprecated, use lastReadAt in chatRoomMembers instead

  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"), // For message editing
  deletedAt: timestamp("deleted_at"), // For soft delete
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
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, cancelled

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
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
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),

  content: text("content").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(() => new Date()),
});

// --- Likes Table ---
export const likesTable = pgTable("likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),
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
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),

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

// --- Reposts Table ---
export const repostsTable = pgTable("reposts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Sessions Table ---
export const sessionsTable = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(), // เจ้าของ session
  activeUserId: uuid("active_user_id").references(() => usersTable.id).notNull(), // ตัวตนที่ใช้งานปัจจุบัน
  token: text("token").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});