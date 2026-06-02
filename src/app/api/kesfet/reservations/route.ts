import { customerAuthNotReadyResponse } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
    return customerAuthNotReadyResponse();
}

export async function POST() {
    return customerAuthNotReadyResponse();
}
