import assert from "node:assert/strict";
import test from "node:test";

import { resolveCategoryMetadata } from "./category-metadata";

test("category metadata restores canonical Turkish labels and sector icons", () => {
    assert.deepEqual(resolveCategoryMetadata("Guzellik & Kuafor"), {
        id: "guzellik_&_kuafor",
        label: "G\u00fczellik & Kuaf\u00f6r",
        emoji: "\ud83d\udc85",
    });
    assert.deepEqual(resolveCategoryMetadata("Klinik & Saglik"), {
        id: "klinik_&_saglik",
        label: "Klinik & Sa\u011fl\u0131k",
        emoji: "\ud83e\ude7a",
    });
    assert.deepEqual(resolveCategoryMetadata("F\u0131r\u0131n, Pastane & Tatl\u0131"), {
        id: "firin,_pastane_&_tatli",
        label: "F\u0131r\u0131n, Pastane & Tatl\u0131",
        emoji: "\ud83e\udd50",
    });
    assert.equal(resolveCategoryMetadata("Ara\u00e7 Kiralama").emoji, "\ud83d\ude98");
    assert.equal(resolveCategoryMetadata("Oto Servis, Bak\u0131m & Lastik").emoji, "\ud83d\udd27");
});

test("category metadata defines every planned local business sector", () => {
    const expected = [
        ["pharmacy", "eczane", "Eczane"],
        ["fitness", "spor_salonu_&_fitness", "Spor Salonu & Fitness"],
        ["education", "egitim,_kurs_&_surucu_kursu", "E\u011fitim, Kurs & S\u00fcr\u00fcc\u00fc Kursu"],
        ["fashion", "giyim,_ayakkabi_&_butik", "Giyim, Ayakkab\u0131 & Butik"],
        ["furniture", "mobilya_&_ev_dekorasyonu", "Mobilya & Ev Dekorasyonu"],
        ["electronics", "elektronik,_telefon_&_bilgisayar", "Elektronik, Telefon & Bilgisayar"],
        ["construction_supply", "yapi_market_&_insaat_malzemeleri", "Yap\u0131 Market & \u0130n\u015faat Malzemeleri"],
        ["florist_stationery", "cicekci,_hediyelik_&_kirtasiye", "\u00c7i\u00e7ek\u00e7i, Hediyelik & K\u0131rtasiye"],
        ["cleaning_laundry", "temizlik,_camasirhane_&_kuru_temizleme", "Temizlik, \u00c7ama\u015f\u0131rhane & Kuru Temizleme"],
        ["event_wedding", "dugun_salonu_&_organizasyon", "D\u00fc\u011f\u00fcn Salonu & Organizasyon"],
        ["professional_services", "avukat,_muhasebe_&_danismanlik", "Avukat, Muhasebe & Dan\u0131\u015fmanl\u0131k"],
        ["photography", "fotografci_&_produksiyon", "Foto\u011fraf\u00e7\u0131 & Prod\u00fcksiyon"],
        ["gas_station", "akaryakit_istasyonu", "Akaryak\u0131t \u0130stasyonu"],
        ["logistics", "kargo,_kurye_&_lojistik", "Kargo, Kurye & Lojistik"],
        ["car_wash", "oto_yikama_&_detayli_temizlik", "Oto Y\u0131kama & Detayl\u0131 Temizlik"],
    ];

    for (const [input, id, label] of expected) {
        const metadata = resolveCategoryMetadata(input);
        assert.equal(metadata.id, id);
        assert.equal(metadata.label, label);
        assert.notEqual(metadata.emoji, "\ud83d\udccd");
    }
});

test("category metadata merges malformed legacy labels into canonical categories", () => {
    assert.equal(resolveCategoryMetadata("Fast Food (Burger,pizza ve digerleri)").id, "fast_food");
    assert.equal(resolveCategoryMetadata("Kahve Shop").id, "kafe_&_kahve");
    assert.equal(resolveCategoryMetadata("Kahve D\ufffdkkan\u0131 & Kafe").id, "kafe_&_kahve");
    assert.equal(resolveCategoryMetadata("Ara\ufffd Kiralama").id, "arac_kiralama");
    assert.equal(resolveCategoryMetadata("Emlak  ofisi").id, "emlak_&_gayrimenkul");
});
