import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/api-error";

type Part = "body" | "query" | "params";

function formatIssues(issues: { path: (string | number | symbol)[]; message: string }[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join("; ");
}

export function validate(schemas: Partial<Record<Part, ZodTypeAny>>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const part of ["body", "query", "params"] as Part[]) {
        const schema = schemas[part];
        if (!schema) continue;
        const result = schema.safeParse(req[part]);
        if (!result.success) {
          throw ApiError.badRequest(
            part === "query" ? "INVALID_QUERY" : "VALIDATION_ERROR",
            formatIssues(result.error.issues),
          );
        }
        Object.defineProperty(req, part, { value: result.data });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
