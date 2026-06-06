import { type NextRequest } from "next/server";
import { beginLogtoSignIn } from "@/server/auth/logto/service";

export async function GET(request: NextRequest) {
    return beginLogtoSignIn(request);
}
