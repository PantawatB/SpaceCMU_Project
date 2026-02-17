# Architecture Overview
This document serves as a critical, living template designed to equip agents with a rapid and comprehensive understanding of the codebase's architecture, enabling efficient navigation and effective contribution from day one. Update this document as the codebase evolves.

## 1. Project Structure
This section provides a high-level overview of the project's directory and file structure, categorised by architectural layer or major functional area.

```
[Project Root]/
├── spacecmu-backend/     # Contains all server-side code and APIs
│   ├── src/              # Main source code for backend services
│   │   ├── controllers/  # API route handlers and business logic
│   │   ├── routes/       # API endpoint definitions
│   │   ├── middleware/   # Express middleware (Auth, Validation)
│   │   ├── utils/        # Utility functions (Session, etc.)
│   │   ├── app.ts        # Express app setup
│   │   └── server.ts     # Server entry point
│   ├── db/               # Database configuration and schema
│   │   ├── schema.ts     # Drizzle ORM schema definitions
│   │   └── migration/    # SQL migration files
│   ├── tests/            # specific test scripts (e.g., test_profile.ts)
│   ├── docker-compose.yml # Docker infrastructure definition
│   └── Dockerfile        # Dockerfile for backend deployment
├── spacecmu/             # Contains all client-side code (Next.js)
│   ├── src/              # Main source code for frontend applications
│   │   ├── app/          # Next.js App Router pages and layouts
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React Context for state management
│   │   ├── lib/          # Frontend utility libraries
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Publicly accessible assets
│   └── package.json      # Frontend dependencies and scripts
└── README.md             # Project overview and quick start guide
```

## 2. High-Level System Diagram

```mermaid
graph TD
    User[User] <--> Frontend[Frontend Application (Next.js)]
    Frontend <-->|REST API / Socket.io| Backend[Backend Service (Express)]
    Backend <-->|Drizzle ORM| Database[(PostgreSQL Database)]
```

## 3. Core Components

### 3.1. Frontend

**Name**: SpaceCMU Web App

**Description**: The main user interface for interacting with the system. It handles user authentication, profile management, social feeds (posts, comments, likes), real-time chat, and the marketplace. Built with Next.js using the App Router for modern server-side rendering and routing.

**Technologies**: 
- Framework: Next.js 16
- UI Library: React 19
- Styling: TailwindCSS 4
- Language: TypeScript

**Deployment**: 
- Currently configured for local development via `npm run dev`.
- Production build via `npm run build`.

### 3.2. Backend Services

#### 3.2.1. SpaceCMU Backend API

**Name**: Main Backend Service

**Description**: A monolithic Express.js server that handles all API requests, business logic, and database interactions. It provides RESTful endpoints for the frontend and maintains real-time connections via Socket.io for chat and notifications.

**Technologies**: 
- Runtime: Node.js
- Framework: Express.js (v5)
- Database ORM: Drizzle ORM
- Real-time: Socket.io
- Authentication: JSON Web Tokens (JWT)
- Language: TypeScript

**Deployment**: 
- Containerized via Docker.
- Orchestrated with Docker Compose alongside the database.

## 4. Data Stores

### 4.1. Primary Database

**Name**: SpaceCMU Postgres DB

**Type**: PostgreSQL 17

**Purpose**: Stores all persistent application data including users, content, and relationships.

**Key Tables**: 
- `users`: User accounts, profiles, authentication details, and settings.
- `posts`, `post_media`: User-generated content and associated media.
- `friendships`: Social graph connections between users.
- `chat_rooms`, `chat_room_members`, `messages`: Real-time messaging data.
- `market_items`, `market_categories`: Marketplace listings and taxonomy.
- `notifications`: User activity notifications.
- `calendar_events`: User schedule and event data.
- `activities`: System audit logs.

## 5. External Integrations / APIs

*Currently, the system relies primarily on internal services. No major third-party external APIs (like Stripe, Google Maps) are explicitly integrated into the core flow based on current dependencies.*

## 6. Deployment & Infrastructure

**Environment**: Local Development (Docker Compose)

**Key Services Used**:
- **Postgres**: Database container (`postgres:17-alpine`).
- **Backend**: Application server container.

**CI/CD Pipeline**: 
- *To be configured (e.g., GitHub Actions).*

**Monitoring & Logging**:
- Standard stdout/stderr logging from containers.

## 7. Security Considerations

**Authentication**: 
- **JWT (JSON Web Tokens)**: Used for stateless authentication. Tokens are verified via middleware (`sessionMiddleware`).
- **Sessions**: Tracked in the `sessions` table for device/login management.

**Authorization**: 
- **Role-Based**: Basic distinction between `user` and `admin` roles in the `users` table.

**Data Protection**:
- **Helmet**: Middleware used to set secure HTTP headers.
- **CORS**: Configured to restrict cross-origin access.

## 8. Development & Testing Environment

**Local Setup Instructions**:
1. Clone the repository.
2. Ensure Docker is running.
3. Run `npm run dev` in `spacecmu` for frontend.
4. Run `docker-compose up` in `spacecmu-backend` (or root if configured) to start backend and DB.
5. Apply migrations via `npm run db:migrate`.

**Testing**: 
- **Backend**: Specific test scripts in `spacecmu-backend/db/*.ts` (e.g., `test_profile.ts`, `test_repost.ts`) used for verifying logic.
- **Frontend**: Standard Next.js linting (`eslint`).

## 9. Future Considerations / Roadmap

- **Microservices**: Potential splitting of Chat or Notification services if scaling requires.
- **Real-time scaling**: Moving Socket.io to a separate service or using Redis adapter for multiple instances.
- **File Storage**: Currently `uploads/` directory; moving to S3-compatible storage for production.

## 10. Project Identification

**Project Name**: SpaceCMU

**Repository URL**: https://github.com/PantawatB/SpaceCMU_Project

**Primary Contact/Team**: SpaceCMU Team

**Date of Last Update**: 2026-02-17
