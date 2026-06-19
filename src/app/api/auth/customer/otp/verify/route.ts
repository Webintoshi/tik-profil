import { handleCustomerOtpVerify } from "@/server/auth/nativeCustomerAuth/routeHandlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    return handleCustomerOtpVerify(request);
}
