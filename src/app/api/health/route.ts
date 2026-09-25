import { NextResponse } from "next/server";
import { getCatalogMode } from "@/catalog/runtime-config";

export function GET() {
  return NextResponse.json({
    status: "ok",
    catalogMode: getCatalogMode(),
    timestamp: new Date().toISOString(),
  });
}
