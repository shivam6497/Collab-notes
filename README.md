# ✏️ Collab Notes

A real-time collaborative note-taking app built with **Yjs CRDTs**, **Socket.IO**, and a **TipTap** rich-text editor. Create a note, share the link — anyone can join and edit simultaneously with zero conflicts.

> **No account required to start.** Sign up only when you want to save notes to your dashboard.

---

## ✨ Features

| Category | Details |
|---|---|
| **Real-time collaboration** | Conflict-free editing powered by Yjs CRDTs — every keystroke syncs instantly across all connected clients |
| **Live cursors & presence** | See collaborators' cursors and names in real-time via the Yjs awareness protocol |
| **Rich-text editor** | TipTap-based editor with bold, italic, underline, code, headings, bullet/ordered lists, and slash commands |
| **Slash commands** | Type `/` to quickly insert headings, lists, code blocks, and more |
| **Document sharing** | Three share modes — **Edit** (open), **View** (read-only), and **Password-protected** |
| **Auto-save** | Debounced persistence — documents are saved to PostgreSQL 5 seconds after the last edit |
| **User authentication** | JWT-based auth with access/refresh token rotation stored in HTTP-only cookies |
| **Dashboard** | Authenticated users get a personal dashboard to manage saved documents |
| **Rate limiting** | Auth endpoints are rate-limited to prevent brute-force attacks |
| **Scalable WebSockets** | Redis adapter enables horizontal scaling of Socket.IO across multiple server instances |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Client (Next.js)                │
│  TipTap Editor ←→ Yjs Y.Doc ←→ Socket.IO Client    │
│  Zustand Store  │  Axios (REST)  │  Awareness       │
└────────┬───────────────┬───────────────┬────────────┘
         │ WebSocket     │ HTTP/REST     │
         ▼               ▼               │
┌────────────────────────────────────────┐│
│           Server (Express + Socket.IO) ││
│  REST Routes ─── Auth / Documents      ││
│  Socket Handler ── Yjs sync + awareness││
│  Autosave Service ── debounced persist ││
└────┬──────────┬──────────┬─────────────┘│
     │          │          │              │
     ▼          ▼          ▼              │
 PostgreSQL   Redis    In-memory          │
 (Prisma)   (Pub/Sub)  Y.Doc store       │
```

---

## 🛠️ Tech Stack

### Client (`apps/client`)
- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **TipTap 3** — Headless rich-text editor
- **Yjs** — CRDT implementation for conflict-free collaboration
- **Socket.IO Client** — Real-time WebSocket communication
- **Zustand** — Lightweight state management
- **Tailwind CSS 4** — Utility-first styling
- **Lucide React** — Icon library
- **Axios** — HTTP client

### Server (`apps/server`)
- **Express 4** — HTTP server and REST API
- **Socket.IO 4** — WebSocket server with Redis adapter
- **Prisma 5** — Database ORM
- **PostgreSQL** — Primary database
- **Redis** — Socket.IO pub/sub adapter for horizontal scaling
- **Yjs + y-protocols** — Server-side CRDT document management
- **JWT (jsonwebtoken)** — Access and refresh token authentication
- **bcrypt** — Password hashing
- **Zod** — Request validation
- **rate-limiter-flexible** — Auth endpoint rate limiting

### Shared (`packages/types`)
- Shared TypeScript types and socket event constants used by both client and server

### Tooling
- **Turborepo** — Monorepo build orchestration
- **pnpm** — Fast, disk-efficient package manager
- **TypeScript** — End-to-end type safety
- **ESLint** — Linting
- **Jest + Supertest** — Server-side testing

---

## 📁 Project Structure

```
collab-notes/
├── apps/
│   ├── client/                  # Next.js frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx            # Landing page
│   │       │   ├── login/              # Auth page
│   │       │   ├── dashboard/          # User dashboard
│   │       │   └── doc/                # Document editor page
│   │       ├── components/
│   │       │   ├── Editor.tsx          # Main collaborative editor
│   │       │   ├── ShareModal.tsx      # Share settings modal
│   │       │   ├── PasswordGate.tsx    # Password prompt for protected docs
│   │       │   └── SlashCommandPopup.tsx
│   │       └── lib/
│   │           ├── api.ts              # Axios instance
│   │           ├── socket.ts           # Socket.IO client singleton
│   │           ├── store.ts            # Zustand auth store
│   │           ├── slashExtension.ts   # TipTap slash command extension
│   │           └── slashCommands.ts    # Slash command definitions
│   │
│   └── server/                  # Express + Socket.IO backend
│       ├── prisma/
│       │   └── schema.prisma           # Database schema (User, Document)
│       └── src/
│           ├── index.ts                # Server entry point
│           ├── app.ts                  # Express app setup
│           ├── routes/
│           │   ├── auth.route.ts       # Register, login, logout, refresh, me
│           │   └── document.route.ts   # CRUD, share, title, verify-password
│           ├── services/
│           │   ├── auth.service.ts     # JWT, bcrypt, Redis token store
│           │   ├── document.service.ts # Prisma document operations
│           │   └── autosave.service.ts # Debounced Y.Doc → DB persistence
│           ├── socket/
│           │   ├── index.ts            # Socket.IO init with Redis adapter
│           │   └── handler.ts          # join_doc, doc_update, awareness, disconnect
│           ├── middleware/             # Auth, error, rate-limit, validation
│           ├── validator/              # Zod schemas
│           └── lib/                    # Prisma client, Redis client, doc store
│
├── packages/
│   ├── types/                   # Shared TypeScript interfaces & socket events
│   ├── eslint-config/           # Shared ESLint configuration
│   └── typescript-config/       # Shared tsconfig presets
│
├── turbo.json                   # Turborepo pipeline config
├── pnpm-workspace.yaml          # pnpm workspace definition
└── package.json                 # Root scripts (dev, build, lint, type-check)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **PostgreSQL** — running locally or a remote instance
- **Redis** — running locally or a remote instance

### 1. Clone the repository

```bash
git clone https://github.com/shivam6497/Collab-notes.git
cd Collab-notes
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

**Server** — copy and fill in `apps/server/.env.example`:

```bash
cp apps/server/.env.example apps/server/.env
```

```env
PORT=4000
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/collab_notes
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=
REDIS_PASSWORD=
ACCESS_TOKEN_SECRET=your-access-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

**Client** — copy and fill in `apps/client/.env.example`:

```bash
cp apps/client/.env.example apps/client/.env.local
```

```env
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

### 4. Set up the database

```bash
cd apps/server
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 5. Run the dev servers

```bash
pnpm dev
```

This starts both the **client** (http://localhost:3000) and **server** (http://localhost:4000) concurrently via Turborepo.

---

## 📡 API Reference

### Auth Routes (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/register` | Create a new account | ✗ |
| `POST` | `/login` | Log in and receive tokens | ✗ |
| `POST` | `/refresh` | Rotate refresh token | Cookie |
| `POST` | `/logout` | Clear tokens and log out | ✓ |
| `GET` | `/me` | Get current user info | ✓ |

### Document Routes (`/api/docs`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/` | Create a new document | ✗ |
| `GET` | `/my` | List current user's documents | ✓ |
| `GET` | `/:id` | Get document metadata | ✗ |
| `PATCH` | `/:id/save` | Claim/save a document to account | ✓ |
| `PATCH` | `/:id/title` | Update document title | ✓ |
| `PATCH` | `/:id/share` | Update share mode & password | ✓ |
| `GET` | `/:id/share` | Get document share mode | ✗ |
| `POST` | `/:id/verify-password` | Verify password for protected docs | ✗ |
| `DELETE` | `/:id` | Delete a document | ✓ |

### Socket Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client → Server | `join_doc` | `{ docId, username, password?, token? }` | Join a document room |
| Client → Server | `doc_update` | `{ docId, update }` | Send a Yjs document update |
| Client → Server | `awareness_update` | `{ docId, awareness }` | Send cursor/presence update |
| Client → Server | `leave_doc` | `{ docId }` | Leave a document room |
| Server → Client | `doc_state` | `{ update }` | Full document state on join |
| Server → Client | `doc_update` | `{ update }` | Broadcast Yjs update to peers |
| Server → Client | `awareness_update` | `{ awareness }` | Broadcast presence to peers |

---

## 🗄️ Database Schema

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  documents Document[]
  createdAt DateTime   @default(now())
}

model Document {
  id        String    @id @default(cuid())
  title     String    @default("Untitled")
  content   Bytes?
  userId    String?
  user      User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  shareMode ShareMode @default(EDIT)
  password  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

enum ShareMode {
  EDIT      // Anyone with the link can edit
  VIEW      // Anyone with the link can view (read-only)
  PASSWORD  // Requires password to access
}
```

---

## 🧪 Testing

```bash
# Run server tests
cd apps/server
pnpm test
```

---

## 📜 Available Scripts

From the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Run TypeScript type checking |

---

## 📄 License

This project is private and not currently published under an open-source license.
