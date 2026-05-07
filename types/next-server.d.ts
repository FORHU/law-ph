import type { NextRequest } from "next/server";

declare global {
  type NextRequest = import("next/server").NextRequest;
  type NextResponse = import("next/server").NextResponse;
}
