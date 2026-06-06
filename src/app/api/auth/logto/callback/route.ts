import { type NextRequest } from "next/server";
import { completeLogtoSignIn } from "@/server/auth/logto/service";

export async function GET(request: NextRequest) {
    return completeLogtoSignIn(request);
}
