import type { Request, Response, NextFunction } from "express";
import { buildUserExportData, exportDataToCsv } from "../services/export.service";
import { ApiError } from "../utils/api-error";

export async function exportUserData(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const exportData = await buildUserExportData(req.user.id);
    res
      .status(200)
      .set("Content-Type", "application/json")
      .set(
        "Content-Disposition",
        'attachment; filename="save-state-export.json"',
      )
      .json(exportData);
  } catch (error) {
    next(error);
  }
}

export async function exportUserDataCsv(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const exportData = await buildUserExportData(req.user.id);
    const csv = exportDataToCsv(exportData);
    res
      .status(200)
      .set("Content-Type", "text/csv; charset=utf-8")
      .set(
        "Content-Disposition",
        'attachment; filename="save-state-export.csv"',
      )
      .send(csv);
  } catch (error) {
    next(error);
  }
}
