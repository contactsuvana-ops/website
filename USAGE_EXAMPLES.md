# Usage Examples - Firestore Integration

This guide shows common patterns and examples for working with the Firestore-backed API.

## Getting the Repository

All data access goes through the `SubmissionsRepository`:

```typescript
import { getSubmissionsRepository } from "@workspace/db";

const repo = getSubmissionsRepository();
```

This is a singleton - same instance throughout the application.

## Creating Submissions

### Contact Form Submission

```typescript
import { getSubmissionsRepository, SubmissionType } from "@workspace/db";

const repo = getSubmissionsRepository();

const submission = await repo.createSubmission({
  type: SubmissionType.CONTACT,
  name: "John Doe",
  email: "john@example.com",
  phone: "555-1234",
  message: "I'd like more information about your services.",
});

console.log(`Created contact submission: ${submission.id}`);
// Returns: {
//   id: "abc123",
//   type: "contact",
//   name: "John Doe",
//   email: "john@example.com",
//   phone: "555-1234",
//   message: "...",
//   createdAt: 2024-05-05T12:00:00Z,
//   updatedAt: 2024-05-05T12:00:00Z
// }
```

### Quote Request Submission

```typescript
const submission = await repo.createSubmission({
  type: SubmissionType.QUOTE,
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "555-5678",
  projectType: "kitchen-remodeling",
  location: "Austin, TX",
  budget: "15k-50k",
  timeline: "3-6-months",
  message: "Need kitchen renovation for our home.",
});
```

## Retrieving Submissions

### Get Single Submission

```typescript
const submission = await repo.getSubmission("abc123");

if (!submission) {
  console.log("Submission not found");
} else {
  console.log(`Submission from ${submission.name}`);
}
```

### List Submissions (Paginated)

```typescript
// Get first page (default: 20 items)
const { submissions, total } = await repo.listSubmissions({
  type: "all",
  page: 1,
  limit: 20,
});

console.log(`Found ${total} submissions, showing page 1 (${submissions.length} items)`);

submissions.forEach((sub) => {
  console.log(`${sub.name}: ${sub.message.substring(0, 50)}...`);
});
```

### Filter by Type

```typescript
// Get only contact submissions
const { submissions: contacts } = await repo.listSubmissions({
  type: "contact",
  page: 1,
  limit: 50,
});

// Get only quote submissions
const { submissions: quotes } = await repo.listSubmissions({
  type: "quote",
  page: 1,
  limit: 50,
});
```

### Pagination

```typescript
// Page 1
let result = await repo.listSubmissions({ page: 1, limit: 20 });
console.log(`Page 1: ${result.submissions.length}/${result.total}`);

// Page 2
result = await repo.listSubmissions({ page: 2, limit: 20 });
console.log(`Page 2: ${result.submissions.length}/${result.total}`);

// Calculate total pages
const totalPages = Math.ceil(result.total / 20);
```

## Getting Statistics

```typescript
const stats = await repo.getSubmissionStats();

console.log("Statistics:");
console.log(`- Total contact submissions: ${stats.totalContacts}`);
console.log(`- Total quote requests: ${stats.totalQuotes}`);
console.log(`- Recent submissions (30 days): ${stats.recentSubmissions}`);
console.log("\nBreakdown by project type:");

stats.byProjectType.forEach(({ projectType, count }) => {
  console.log(`  - ${projectType}: ${count}`);
});

// Output:
// Statistics:
// - Total contact submissions: 42
// - Total quote requests: 156
// - Recent submissions (30 days): 23
// 
// Breakdown by project type:
//   - kitchen-remodeling: 34
//   - flooring: 28
//   - plumbing: 22
//   - electrical: 20
//   - ...
```

## Managing Comments

### Add Comment to Submission

```typescript
const comment = await repo.addComment("submission_id", {
  content: "This project looks interesting. Schedule a call.",
  isShared: false, // Internal note (not sent to customer)
});

console.log(`Comment added: ${comment.id}`);
```

### Get Comments for Submission

```typescript
const comments = await repo.getComments("submission_id");

comments.forEach((comment) => {
  const type = comment.isShared ? "Public" : "Internal";
  console.log(`[${type}] ${comment.content}`);
  console.log(`  ${comment.createdAt.toLocaleString()}\n`);
});
```

### Public vs Internal Comments

```typescript
// Internal note (only visible to staff)
await repo.addComment("submission_id", {
  content: "This is a spam submission - low budget, generic message",
  isShared: false,
});

// Public comment (could be sent to customer)
await repo.addComment("submission_id", {
  content: "We'll follow up with an estimate by Friday",
  isShared: true,
});
```

## Using in Express Routes

### Example: List Submissions API

```typescript
import { Router } from "express";
import { getSubmissionsRepository } from "@workspace/db";
import { GetSubmissionsQueryParams } from "@workspace/api-zod";
import { logger } from "./logger";

const router = Router();

router.get("/api/submissions", async (req, res) => {
  try {
    // Validate query parameters
    const parsed = GetSubmissionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    // Get repository
    const repo = getSubmissionsRepository();

    // List submissions
    const { submissions, total } = await repo.listSubmissions({
      type: parsed.data.type ?? "all",
      page: parsed.data.page ?? 1,
      limit: parsed.data.limit ?? 20,
    });

    // Return response
    res.json({
      submissions,
      total,
      page: parsed.data.page ?? 1,
      limit: parsed.data.limit ?? 20,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### Example: Create Contact Route

```typescript
router.post("/api/contact", async (req, res) => {
  try {
    // Validate request body
    const parsed = SubmitContactBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { honeypot, ...data } = parsed.data;

    // Honeypot spam detection
    if (honeypot?.trim()) {
      return res.status(201).json({
        success: true,
        id: 0,
        message: "Thank you for your message!",
      });
    }

    // Create submission
    const repo = getSubmissionsRepository();
    const submission = await repo.createSubmission({
      type: "contact",
      ...data,
    });

    // Send email (fire and forget)
    sendContactEmail(data).catch((error) => {
      logger.error({ error }, "Failed to send email");
    });

    // Log and respond
    req.log.info({ id: submission.id }, "Contact submission created");
    res.status(201).json({
      success: true,
      id: submission.id,
      message: "Thank you for reaching out! We will get back to you within 1–2 business days.",
    });
  } catch (error) {
    logger.error({ error }, "Error processing contact form");
    res.status(500).json({ error: "Internal server error" });
  }
});
```

## Type Safety Examples

### Using Inferred Types

```typescript
import { type Submission, type InsertSubmission } from "@workspace/db";

// Type is automatically inferred from Zod schema
function processSubmission(sub: Submission): void {
  // IDE autocomplete works - knows all properties
  console.log(sub.id);
  console.log(sub.name);
  console.log(sub.email);
  // sub.foo ❌ TypeScript error - property doesn't exist
}

// Create with typed data
const data: InsertSubmission = {
  type: "contact",
  name: "John",
  email: "john@example.com",
  phone: "555-1234",
  message: "Hello",
};
```

### Validation Example

```typescript
import { insertSubmissionSchema } from "@workspace/db";

// Parse and validate
const result = insertSubmissionSchema.safeParse(req.body);

if (!result.success) {
  // Get specific errors
  console.log(result.error.issues);
  // [
  //   { code: 'too_small', minimum: 1, type: 'string', path: ['name'] },
  //   { code: 'invalid_email', path: ['email'] }
  // ]
  
  return res.status(400).json({ error: result.error.message });
}

// Now it's typed and validated
const data = result.data; // Type: InsertSubmission
```

## Testing Example

### Unit Test with Mock

```typescript
import { SubmissionsRepository } from "@workspace/db";
import { Firestore } from "firebase-admin/firestore";

// Mock Firestore
const mockDb = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      set: jest.fn(),
      get: jest.fn(),
    }),
  }),
} as unknown as Firestore;

// Create repository with mock
const repo = new SubmissionsRepository(mockDb);

// Test
describe("SubmissionsRepository", () => {
  it("should create a submission", async () => {
    const submission = await repo.createSubmission({
      type: "contact",
      name: "John",
      email: "john@example.com",
      phone: "555-1234",
      message: "Hello",
    });

    expect(mockDb.collection).toHaveBeenCalledWith("submissions");
    expect(submission).toBeDefined();
    expect(submission.id).toBeDefined();
  });
});
```

### Integration Test with Emulator

```typescript
import { initializeFirebase } from "@workspace/db";

// Ensure emulator is running: firebase emulators:start

describe("API Integration", () => {
  it("should create and retrieve submission", async () => {
    // Initialize with emulator
    const db = initializeFirebase();
    const repo = new SubmissionsRepository(db);

    // Create
    const created = await repo.createSubmission({
      type: "contact",
      name: "Test User",
      email: "test@example.com",
      phone: "555-0000",
      message: "Test message",
    });

    // Retrieve
    const retrieved = await repo.getSubmission(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Test User");
    expect(retrieved?.email).toBe("test@example.com");
  });
});
```

## Error Handling Example

```typescript
import { logger } from "./logger";

async function handleSubmission(req: Request, res: Response) {
  try {
    const repo = getSubmissionsRepository();
    const submission = await repo.createSubmission(data);

    res.status(201).json(submission);
  } catch (error) {
    // Log with context
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
      },
      "Failed to create submission",
    );

    // Return user-friendly error
    res.status(500).json({
      error: "Internal server error",
    });
  }
}
```

## Common Patterns

### Pagination Helper

```typescript
async function getPaginatedSubmissions(page: number = 1, limit: number = 20) {
  const repo = getSubmissionsRepository();
  const { submissions, total } = await repo.listSubmissions({
    page,
    limit,
  });

  return {
    data: submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}
```

### Batch Processing

```typescript
async function archiveOldSubmissions(days: number = 90) {
  const repo = getSubmissionsRepository();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let archived = 0;
  let page = 1;

  while (true) {
    const { submissions } = await repo.listSubmissions({
      page,
      limit: 100,
    });

    if (submissions.length === 0) break;

    for (const submission of submissions) {
      if (submission.createdAt < cutoffDate) {
        await repo.deleteSubmission(submission.id);
        archived++;
      }
    }

    page++;
  }

  console.log(`Archived ${archived} submissions`);
}
```

## Firestore Best Practices

### 1. Always Handle Errors

```typescript
try {
  await repo.createSubmission(data);
} catch (error) {
  logger.error({ error }, "Failed to create");
  throw error;
}
```

### 2. Use Pagination for Large Lists

```typescript
// ❌ Don't fetch all submissions
const allSubs = await repo.listSubmissions({ limit: 10000 });

// ✅ Use pagination
const firstPage = await repo.listSubmissions({ page: 1, limit: 20 });
```

### 3. Validate Input

```typescript
// ❌ Don't trust user input
const submission = await repo.createSubmission(req.body);

// ✅ Validate first
const parsed = insertSubmissionSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: ... });
const submission = await repo.createSubmission(parsed.data);
```

### 4. Log Important Events

```typescript
req.log.info({ id: submission.id, type: submission.type }, "Submission created");
```

### 5. Use Type Safety

```typescript
// ❌ Use `any`
const submission: any = await repo.getSubmission(id);

// ✅ Use proper types
const submission: Submission | null = await repo.getSubmission(id);
```

---

That's it! The pattern is consistent throughout - use the repository for all data access, validate with Zod, handle errors, and log important events.
