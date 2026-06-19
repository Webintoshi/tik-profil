import test from "node:test";
import assert from "node:assert/strict";

import {
    getCustomerPhoneOtpErrorMessage,
    getCustomerPhoneOtpStepCopy,
} from "./customerPhoneOtpCopy.ts";

test("customer phone OTP copy uses native-feeling login states", () => {
    assert.deepEqual(getCustomerPhoneOtpStepCopy("phone"), {
        action: "Kod gönder",
        body: "Cep telefonuna tek kullanımlık giriş kodu göndereceğiz.",
        title: "Telefonla giriş yap",
    });
    assert.deepEqual(getCustomerPhoneOtpStepCopy("code"), {
        action: "Girişi tamamla",
        body: "SMS ile gelen 6 haneli kodu gir.",
        title: "Kodu doğrula",
    });
    assert.deepEqual(getCustomerPhoneOtpStepCopy("success"), {
        action: "Devam et",
        body: "Hesabın hazırlandı.",
        title: "Giriş tamamlandı",
    });
});

test("customer phone OTP errors hide provider details and use safe Turkish copy", () => {
    assert.equal(
        getCustomerPhoneOtpErrorMessage("INVALID_PHONE", "raw provider error"),
        "Geçerli bir Türkiye cep telefonu girin.",
    );
    assert.equal(
        getCustomerPhoneOtpErrorMessage("OTP_RESEND_COOLDOWN", "raw provider error"),
        "Yeni kod istemeden önce biraz bekleyin.",
    );
    assert.equal(
        getCustomerPhoneOtpErrorMessage("OTP_INVALID", "raw provider error"),
        "Kod hatalı. Tekrar kontrol edin.",
    );
    assert.equal(
        getCustomerPhoneOtpErrorMessage("NETGSM_UNCONFIGURED", "NETGSM_PASSWORD missing"),
        "Telefonla giriş şu anda hazırlanıyor. Lütfen daha sonra tekrar deneyin.",
    );
    assert.equal(
        getCustomerPhoneOtpErrorMessage(undefined, "database stack trace"),
        "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    );
});
