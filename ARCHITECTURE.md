# Modular Architecture Design

This document explains the design patterns and principles used in the Firestore conversion to ensure maximum modularity, maintainability, and extensibility.

## Design Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:

```
┌─────────────────────────────────────────┐
│         Express Routes                  │  Layer: API Endpoints
│   (contact.ts, quote.ts, submissions.ts)│
└────────────────┬────────────────────────┘
                 │ Uses
                 ▼
┌─────────────────────────────────────────┐
│   SubmissionsRepository                 │  Layer: Data Access
│   (firebase/repository.ts)              │
└────────────────┬────────────────────────┘
                 │ Reads/Writes
                 ▼
┌─────────────────────────────────────────┐
│   Firebase Admin SDK                    │  Layer: Database Client
│   (firebase/config.ts)                  │
└────────────────┬────────────────────────┘
                 │ Connects to
                 ▼
┌─────────────────────────────────────────┐
│   Firestore Cloud Database              │  Layer: Storage
└─────────────────────────────────────────┘
```

### 2. Repository Pattern

The `SubmissionsRepository` class encapsulates all data access:

```typescript
// Routes DON'T do this:
const snapshot = await db.collection("submissions").where(...).get();
submissions = snapshot.docs.map(...);

// Routes DO this:
const repo = getSubmissionsRepository();
const { submissions } = await repo.listSubmissions({ type, page, limit });
```

**Benefits:**
- Decouples business logic from data storage
- Single place to optimize queries
- Easy to mock for testing
- Can swap implementations (Firestore → PostgreSQL → MongoDB)

### 3. Dependency Injection

Services are injected rather than hardcoded:

```typescript
// ❌ Anti-pattern (hardcoded)
class SubmissionsRepository {
  private db = getFirestore(); // Hardcoded dependency
}

// ✅ Good pattern (injected)
class SubmissionsRepository {
  constructor(private db: Firestore) {} // Injectable dependency
}

// Usage:
const db = initializeFirebase();
const repo = new SubmissionsRepository(db);
```

**Benefits:**
- Easy to test (inject mock)
- Easy to change implementations
- Clear dependencies
- Follows SOLID principles

### 4. Factory Pattern

Centralized creation of services:

```typescript
// lib/db/src/index.ts
let submissionsRepository: SubmissionsRepository | null = null;

export function getSubmissionsRepository(): SubmissionsRepository {
  if (!submissionsRepository) {
    submissionsRepository = new SubmissionsRepository(getFirestore());
  }
  return submissionsRepository;
}
```

**Benefits:**
- Singleton pattern (single instance per app)
- Lazy initialization (only created when needed)
- Centralized configuration
- Easy to add caching or logging

### 5. Type Safety with Zod

Schemas are defined once, used everywhere:

```typescript
// Define once
export const insertSubmissionSchema = z.object({
  type: z.literal("contact"),
  name: z.string(),
  ...
});

// Infer types
type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

// Use in routes
const parsed = insertSubmissionSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: ... });
const data = parsed.data; // Type is InsertSubmission ✅

// Use in repository
async createSubmission(data: InsertSubmission): Promise<SubmissionDocument> {
  // data is fully typed ✅
  await docRef.set(data);
}
```

**Benefits:**
- Single source of truth
- Compile-time type safety
- Runtime validation
- Clear API contracts

## Module Structure

```
lib/db/
├── src/
│   ├── firebase/
│   │   ├── config.ts              # Initialization (can be replaced)
│   │   ├── schemas.ts             # Type definitions (can be replaced)
│   │   ├── repository.ts          # Data access (main logic)
│   │   ├── migrate.ts             # Tools (can be replaced)
│   │   └── index.ts               # Public exports
│   └── index.ts                   # Main entry point

artifacts/api-server/src/
├── routes/
│   ├── contact.ts                 # Uses repository
│   ├── quote.ts                   # Uses repository
│   └── submissions.ts             # Uses repository
└── app.ts                         # Express setup
```

## Adding New Features

### Example: Add a "Read" flag to submissions

1. **Update schema** (`firebase/schemas.ts`):
```typescript
export const submissionSchema = z.object({
  // existing fields...
  isRead: z.boolean().default(false),
});
```

2. **Update repository** (`firebase/repository.ts`):
```typescript
async markAsRead(submissionId: string): Promise<void> {
  await this.updateSubmission(submissionId, { isRead: true });
}

async getUnreadCount(): Promise<number> {
  const snapshot = await this.db
    .collection("submissions")
    .where("isRead", "==", false)
    .count()
    .get();
  return snapshot.data().count;
}
```

3. **Add route** (`artifacts/api-server/src/routes/submissions.ts`):
```typescript
router.patch("/submissions/:id/read", async (req, res) => {
  const repo = getSubmissionsRepository();
  await repo.markAsRead(req.params.id);
  res.json({ success: true });
});

router.get("/submissions/unread-count", async (req, res) => {
  const repo = getSubmissionsRepository();
  const count = await repo.getUnreadCount();
  res.json({ unreadCount: count });
});
```

**No other files need to change!** The separation is clean.

## Testing Strategy

### Unit Tests

Test repository in isolation:

```typescript
// __tests__/repository.test.ts
describe("SubmissionsRepository", () => {
  let mockDb: MockFirestore;
  let repo: SubmissionsRepository;

  beforeEach(() => {
    mockDb = createMockFirestore();
    repo = new SubmissionsRepository(mockDb);
  });

  it("should create a submission", async () => {
    const submission = await repo.createSubmission({
      type: "contact",
      name: "John",
      email: "john@example.com",
      phone: "555-1234",
      message: "Hello",
    });

    expect(submission.id).toBeDefined();
    expect(mockDb.collection("submissions").set).toHaveBeenCalled();
  });
});
```

### Integration Tests

Test with real Firestore emulator:

```typescript
// __tests__/api.integration.test.ts
describe("Contact API", () => {
  it("should submit contact form", async () => {
    const res = await request(app)
      .post("/api/contact")
      .send({
        name: "John",
        email: "john@example.com",
        phone: "555-1234",
        message: "Hello",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    // Verify in Firestore
    const doc = await getSubmissionsRepository().getSubmission(res.body.id);
    expect(doc).toBeDefined();
  });
});
```

## Scaling Considerations

### If users grow 10x:

**No changes needed** to most of the code:
- Firestore auto-scales
- Repository handles pagination
- Indexes are created automatically

**Minor optimizations:**
```typescript
// Add caching
class SubmissionsRepository {
  private cache = new Map<string, SubmissionDocument>();

  async getSubmission(id: string): Promise<SubmissionDocument | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const doc = await this.db.collection("submissions").doc(id).get();
    // ...
    this.cache.set(id, result);
    return result;
  }
}
```

### If adding a second database (hybrid approach):

```typescript
// Create a new repository
class PostgresSubmissionsRepository implements ISubmissionsRepository {
  async createSubmission(data: InsertSubmission): Promise<SubmissionDocument> {
    // Implementation using PostgreSQL
  }
  // ...
}

// Use factory pattern to select
export function getSubmissionsRepository(): ISubmissionsRepository {
  if (process.env.USE_POSTGRES) {
    return new PostgresSubmissionsRepository();
  }
  return new SubmissionsRepository(getFirestore());
}
```

**Routes don't change** because they use the interface!

## Error Handling

All layers handle errors gracefully:

```typescript
// Route layer: Returns HTTP errors
router.get("/submissions", async (req, res) => {
  try {
    const { submissions } = await repo.listSubmissions(options);
    res.json({ submissions });
  } catch (error) {
    logger.error({ error }, "Failed to fetch submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Repository layer: Throws detailed errors
async listSubmissions(options: ListOptions): Promise<Result> {
  try {
    // ...
  } catch (error) {
    throw new RepositoryError(`Failed to list submissions: ${error.message}`);
  }
}

// Config layer: Validates and throws setup errors
export function initializeFirebase(): Firestore {
  if (!credentials) {
    throw new Error("Firebase credentials not configured");
  }
  // ...
}
```

## Monitoring & Observability

Each layer logs appropriately:

```typescript
// Route layer: Business logic
req.log.info({ id: submission.id }, "Contact submission created");

// Repository layer: Data operations
logger.info({ submissionCount: total }, "Retrieved submissions");

// Config layer: Setup events
logger.info({ projectId }, "Firebase initialized");

// Errors logged with context
logger.error({ error, submissionId }, "Failed to process submission");
```

## Summary

The modular architecture provides:

| Feature | Benefit |
|---------|---------|
| Repository Pattern | Easy to test, switch databases |
| Dependency Injection | Decoupled, flexible |
| Factory Pattern | Centralized, lazy-loaded |
| Type Safety | Compile + runtime validation |
| Separation of Concerns | Clear responsibilities |
| Error Handling | Graceful degradation |
| Logging | Observability |

This allows the codebase to:
- **Grow** without becoming unmaintainable
- **Change** database implementations
- **Scale** efficiently
- **Test** components independently
- **Monitor** production behavior
- **Debug** issues quickly

All while keeping the code clean, readable, and professional.
