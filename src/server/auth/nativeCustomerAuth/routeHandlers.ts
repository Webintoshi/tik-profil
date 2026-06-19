import { createNetgsmOtpDeliveryProvider } from "./netgsm.ts";
import {
    createOtpService,
    type OtpStartResult,
    type OtpVerifyResult,
} from "./otp.ts";
import {
    createNativeCustomerProvisioningService,
    type NativeCustomerProvisioningInput,
    type NativeCustomerProvisioningResult,
} from "./provisioning.ts";
import {
    buildNativeCustomerSessionSetCookieHeader,
    createNativeCustomerSessionToken,
    type NativeCustomerSessionInput,
} from "./session.ts";
import { nativeCustomerAuthErrorResponse } from "./http.ts";

type CustomerOtpService = {
    start(input: { phone: unknown }): Promise<OtpStartResult>;
    verify(input: { code: unknown; phone: unknown }): Promise<OtpVerifyResult>;
};

type CustomerOtpStartService = Pick<CustomerOtpService, "start">;
type CustomerOtpVerifyService = Pick<CustomerOtpService, "verify">;

type CustomerProvisioningService = {
    provision(input: NativeCustomerProvisioningInput): Promise<NativeCustomerProvisioningResult>;
};

export interface CustomerOtpStartRouteDependencies {
    createOtpService?: () => CustomerOtpStartService | Promise<CustomerOtpStartService>;
}

export interface CustomerOtpVerifyRouteDependencies {
    createOtpService?: () => CustomerOtpVerifyService | Promise<CustomerOtpVerifyService>;
    createProvisioningService?: () => CustomerProvisioningService | Promise<CustomerProvisioningService>;
    createSessionToken?: (input: NativeCustomerSessionInput) => Promise<string>;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
    try {
        const body = await request.json();

        return body && typeof body === "object" && !Array.isArray(body)
            ? body as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

async function createDefaultOtpService(): Promise<CustomerOtpService> {
    const { createQueryBackedOtpChallengeRepository } = await import("./otpRepository.ts");

    return createOtpService({
        provider: createNetgsmOtpDeliveryProvider(),
        repository: createQueryBackedOtpChallengeRepository(),
    });
}

async function createDefaultProvisioningService(): Promise<CustomerProvisioningService> {
    const { createQueryBackedNativeCustomerProvisioningRepository } = await import("./provisioningRepository.ts");

    return createNativeCustomerProvisioningService({
        repository: createQueryBackedNativeCustomerProvisioningRepository(),
    });
}

export async function handleCustomerOtpStart(
    request: Request,
    dependencies: CustomerOtpStartRouteDependencies = {},
): Promise<Response> {
    try {
        const body = await readBody(request);
        const otpService = await (dependencies.createOtpService?.() ?? createDefaultOtpService());
        const result = await otpService.start({
            phone: body.phone,
        });

        return Response.json({
            data: result,
            success: true,
        });
    } catch (error) {
        return nativeCustomerAuthErrorResponse(error, "customer-otp-start");
    }
}

export async function handleCustomerOtpVerify(
    request: Request,
    dependencies: CustomerOtpVerifyRouteDependencies = {},
): Promise<Response> {
    try {
        const body = await readBody(request);
        const otpService = await (dependencies.createOtpService?.() ?? createDefaultOtpService());
        const verifiedOtp = await otpService.verify({
            code: body.code,
            phone: body.phone,
        });
        const provisioningService = await (
            dependencies.createProvisioningService?.() ?? createDefaultProvisioningService()
        );
        const provisioning = await provisioningService.provision({
            displayName: null,
            email: null,
            phone: verifiedOtp.phone.e164,
            provider: "native_otp",
            providerUserId: verifiedOtp.providerUserId,
        });
        const token = await (dependencies.createSessionToken ?? createNativeCustomerSessionToken)({
            appUserId: provisioning.appUser.id,
            authProvider: "native_otp",
            displayName: provisioning.displayName,
            email: provisioning.email,
            subject: provisioning.providerUserId,
        });
        const response = Response.json({
            data: {
                actorType: "customer",
                appUserId: provisioning.appUser.id,
                displayName: provisioning.displayName,
                email: provisioning.email,
                logtoSub: provisioning.providerUserId,
                phone: provisioning.phone,
                provider: "native_otp",
                role: "customer",
                success: true,
            },
            success: true,
        });

        response.headers.append("set-cookie", buildNativeCustomerSessionSetCookieHeader(token));

        return response;
    } catch (error) {
        return nativeCustomerAuthErrorResponse(error, "customer-otp-verify");
    }
}
