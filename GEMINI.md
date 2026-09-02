# Backend Coding Conventions & Architecture Guidelines

You must strictly follow this coding style, architecture pattern, and convention for all backend features and modules.

---

## 1. Modular Directory Structure
All feature domains reside in `src/app/module/<feature>/`:
```text
src/app/module/<feature>/
├── <feature>.interface.ts   # Interfaces and types (prefixed with 'I', e.g. ICreatePayload)
├── <feature>.service.ts     # Business logic & Prisma ORM queries
├── <feature>.controller.ts  # Request/response handling, cookies, sendResponse
├── <feature>.route.ts       # Express router and route definitions with middlewares
├── <feature>.validation.ts # Zod validation schemas (if applicable)
└── <feature>.constant.ts   # Feature-specific constants (if applicable)
```

Shared resources reside in:
- `src/app/config/` (environment config)
- `src/app/lib/` (Prisma client, external clients)
- `src/app/middleware/` (`checkAuth`, `globalErrorHandler`, `notFound`)
- `src/app/utils/` (`catchAsync`, `sendResponse`, `jwtUtils`)

---

## 2. Controller Pattern
- Always wrap controller handlers in `catchAsync`:
  ```typescript
  import type { NextFunction, Request, Response } from "express";
  import httpStatus from "http-status";
  import { catchAsync } from "../../utils/catchAsync";
  import { sendResponse } from "../../utils/sendResponse";
  import { FeatureService } from "./feature.service";

  const createItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const result = await FeatureService.createItem(req.body);

      sendResponse(res, {
          statusCode: httpStatus.CREATED,
          success: true,
          message: "Item created successfully",
          data: result,
      });
  });

  export const FeatureController = {
      createItem,
  };
  ```

---

## 3. Service Pattern
- Services contain pure business logic and database queries.
- Use arrow functions and export as a single object:
  ```typescript
  import { prisma } from "../../lib/prisma";
  import type { ICreatePayload } from "./feature.interface";

  const createItem = async (payload: ICreatePayload) => {
      const result = await prisma.item.create({
          data: payload,
      });
      return result;
  };

  export const FeatureService = {
      createItem,
  };
  ```

---

## 4. Route & Middleware Pattern
- Group routes with `express.Router()`.
- Use role-based `auth(Role.ADMIN, Role.PATIENT, ...)` middleware for protected endpoints.
- Export router as `<Feature>Routes`:
  ```typescript
  import { Router } from "express";
  import { Role } from "../../../generated/prisma/enums";
  import { auth } from "../../middleware/checkAuth";
  import { FeatureController } from "./feature.controller";

  const router = Router();

  router.post("/", auth(Role.ADMIN), FeatureController.createItem);

  export const FeatureRoutes = router;
  ```

---

## 5. Response & Error Handling Standards
- Standard API response format via `sendResponse`:
  ```json
  {
      "statusCode": 200,
      "success": true,
      "message": "...",
      "data": {},
      "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 }
  }
  ```
- Error handling flows through `catchAsync` to `globalErrorHandler`.
- For cookies, always respect environment flags (`secure: config.node_env === "production"`).

---

## 6. Code Formatting & TypeScript Rules (Biome Standards)
- **Indentation:** Tab (`indentStyle: "tab"`).
- **Quotes:** Double quotes (`"`).
- **Type imports:** Always use explicit type imports (`import type { ... } from "..."`).
- **Interfaces:** Prefix with `I` (e.g., `IRequestUser`, `ILoginUserPayload`).
- **Data Models:** Soft deletes via `isDeleted` and `deletedAt`. Standard table naming via `@@map("table_names")`.
