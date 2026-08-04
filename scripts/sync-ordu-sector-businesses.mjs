import "dotenv/config";

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";

export const ORDU_DISTRICTS = [
    "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
    "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
    "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
];

export const SECTOR_DEFINITIONS = Object.freeze({
    restaurant: Object.freeze({
        label: "Restoran",
        queryTerms: Object.freeze([
            "restoran", "lokanta", "aile restoranı", "balık restoranı", "et restoranı", "ocakbaşı", "pide salonu",
        ]),
        primaryTypes: new Set([
            "restaurant", "turkish_restaurant", "seafood_restaurant", "steak_house",
            "barbecue_restaurant", "breakfast_restaurant", "family_restaurant",
            "fine_dining_restaurant", "kebab_shop", "mediterranean_restaurant",
            "middle_eastern_restaurant",
        ]),
        genericTypes: new Set(["food", "establishment", "point_of_interest", "meal_takeaway"]),
        excludedTypes: new Set([
            "hamburger_restaurant", "pizza_restaurant", "pizza_delivery", "fast_food_restaurant",
            "gyro_restaurant", "shawarma_restaurant", "sandwich_shop", "snack_bar", "hot_dog_restaurant",
            "cafe", "coffee_shop", "coffee_roastery", "bakery", "bar", "pub", "night_club",
        ]),
        namePattern: /(?:restoran|lokanta|sofra|ocakbaşı|ocakbasi|pide\s*salonu|balık\s*evi|balik\s*evi|et\s*evi)/i,
        excludedNamePattern: /(?:burger|hamburger|pizza|pizzacı|pizzaci|döner|doner|dürüm|durum|tantuni|kokoreç|kokorec|çiğ\s*köfte|cig\s*kofte|fast\s*food|büfe|bufe|tost|sandviç|sandvic|kafe|cafe|coffee|kahve)/i,
    }),
    cafe: Object.freeze({
        label: "Kafe & Kahve",
        queryTerms: Object.freeze([
            "kafe", "cafe", "kahve", "kahve dükkanı", "coffee shop", "çay evi", "çay bahçesi", "kahvehane",
        ]),
        primaryTypes: new Set([
            "cafe", "coffee_shop", "coffee_roastery", "coffee_stand", "cat_cafe", "dog_cafe", "tea_house",
        ]),
        genericTypes: new Set([
            "food", "establishment", "point_of_interest", "meal_takeaway", "restaurant",
        ]),
        excludedTypes: new Set([
            "internet_cafe", "bakery", "cake_shop", "confectionery", "dessert_shop",
            "turkish_restaurant", "seafood_restaurant", "steak_house",
            "barbecue_restaurant", "family_restaurant", "fine_dining_restaurant", "kebab_shop",
            "hamburger_restaurant", "pizza_restaurant", "pizza_delivery", "fast_food_restaurant",
            "gyro_restaurant", "shawarma_restaurant", "sandwich_shop", "snack_bar", "hot_dog_restaurant",
            "bar", "pub", "night_club", "hookah_bar", "lounge_bar", "cocktail_bar",
        ]),
        namePattern: /(?:kafe|cafe|kahve|coffee|roastery|çay\s*(?:evi|bahçesi)|cay\s*(?:evi|bahcesi)|kahvehane)/i,
        excludedNamePattern: /(?:internet\s*(?:cafe|kafe)|pastane|pastanesi|fırın|firin|unlu\s*mamuller(?:i)?|bakery|restoran|restaurant|lokanta|burger|hamburger|pizza|döner|doner|fast\s*food|(?:^|\s)(?:bar|pub|meyhane)(?:\s|$))/i,
    }),
    beauty: Object.freeze({
        label: "Güzellik & Kuaför",
        queryTerms: Object.freeze([
            "güzellik salonu", "güzellik merkezi", "kadın kuaförü", "erkek kuaförü",
            "berber", "saç tasarım", "nail studio", "kalıcı makyaj",
        ]),
        primaryTypes: new Set([
            "barber_shop", "beautician", "beauty_salon", "hair_care", "hair_salon",
            "makeup_artist", "nail_salon", "tanning_studio",
        ]),
        genericTypes: new Set(["establishment", "point_of_interest", "service", "spa", "massage"]),
        excludedTypes: new Set([
            "doctor", "medical_center", "medical_clinic", "skin_care_clinic", "hospital",
            "dental_clinic", "dentist", "physiotherapist", "veterinary_care", "pet_care",
        ]),
        namePattern: /(?:guzellik|kuafor|berber|sac\s*tasarim|hair|beauty|nail|tirnak|makyaj|bakim\s*salonu)/i,
        excludedNamePattern: /(?:veteriner|pet\s*kuafor|hayvan|tip\s*merkezi|saglik\s*merkezi|hastane|eczane|dis\s*klinigi)/i,
    }),
    real_estate: Object.freeze({
        label: "Emlak & Gayrimenkul",
        queryTerms: Object.freeze(["emlak", "gayrimenkul", "emlak ofisi", "gayrimenkul danışmanlığı", "real estate"]),
        primaryTypes: new Set(["real_estate_agency"]),
        genericTypes: new Set(["establishment", "point_of_interest", "corporate_office", "consultant"]),
        excludedTypes: new Set([
            "general_contractor", "roofing_contractor", "architect", "lodging", "hotel",
            "apartment_building", "apartment_complex", "housing_complex",
        ]),
        namePattern: /(?:emlak|gayrimenkul|real\s*estate|property|konut\s*danisman)/i,
        excludedNamePattern: /(?:insaat|mimarlik|yapi\s*malzeme|mobilya|otel|pansiyon|apart\s*otel)/i,
    }),
    lodging: Object.freeze({
        label: "Otel & Konaklama",
        queryTerms: Object.freeze(["otel", "pansiyon", "apart otel", "konaklama", "bungalov", "kamp alanı"]),
        primaryTypes: new Set([
            "bed_and_breakfast", "campground", "camping_cabin", "cottage", "extended_stay_hotel",
            "farmstay", "guest_house", "hostel", "hotel", "inn", "lodging", "motel",
            "private_guest_room", "resort_hotel", "rv_park",
        ]),
        genericTypes: new Set(["establishment", "point_of_interest"]),
        excludedTypes: new Set([
            "real_estate_agency", "apartment_building", "apartment_complex", "housing_complex",
            "restaurant", "cafe", "travel_agency",
        ]),
        namePattern: /(?:otel|hotel|pansiyon|konaklama|bungalov|bungalow|apart\s*otel|hostel|motel|kamp(?:ing)?|guest\s*house)/i,
        excludedNamePattern: /(?:emlak|gayrimenkul|apartman|konut\s*sitesi|ogrenci\s*yurdu|restoran|restaurant|kafe|cafe)/i,
    }),
    car_rental: Object.freeze({
        label: "Araç Kiralama",
        queryTerms: Object.freeze(["araç kiralama", "oto kiralama", "rent a car", "car rental", "filo kiralama"]),
        primaryTypes: new Set(["car_rental"]),
        genericTypes: new Set(["establishment", "point_of_interest", "service", "transportation_service"]),
        excludedTypes: new Set(["car_dealer", "truck_dealer", "car_repair", "tire_shop", "car_wash", "taxi_service"]),
        namePattern: /(?:arac\s*kiralama|oto\s*kiralama|rent\s*a\s*car|car\s*rental|filo\s*kiralama)/i,
        excludedNamePattern: /(?:oto\s*galeri|otomotiv|servis|tamir|lastik|kaporta|taksi|sigorta|web\s*tasarim|internet\s*sitesi|yazilim|reklam\s*ajansi)/i,
    }),
    healthcare: Object.freeze({
        label: "Klinik & Sağlık",
        queryTerms: Object.freeze([
            "sağlık merkezi", "tıp merkezi", "özel klinik", "poliklinik", "diş kliniği",
            "fizyoterapi merkezi", "doktor muayenehanesi", "tıbbi laboratuvar",
        ]),
        primaryTypes: new Set([
            "chiropractor", "dental_clinic", "dentist", "doctor", "general_hospital", "hospital",
            "medical_center", "medical_clinic", "medical_lab", "physiotherapist", "skin_care_clinic",
        ]),
        genericTypes: new Set(["health", "establishment", "point_of_interest", "wellness_center"]),
        excludedTypes: new Set([
            "veterinary_care", "pet_care", "pharmacy", "drugstore", "beauty_salon",
            "hair_salon", "barber_shop", "spa", "massage_spa",
        ]),
        namePattern: /(?:saglik|tip\s*merkezi|klinik|poliklinik|hastane|doktor|hekim|dis\s*(?:klinigi|hekimi)|fizyo|laboratuvar)/i,
        excludedNamePattern: /(?:veteriner|hayvan|pet|eczane|guzellik|kuafor|berber|spa)/i,
    }),
    grocery: Object.freeze({
        label: "Market & Bakkal",
        queryTerms: Object.freeze(["market", "süpermarket", "bakkal", "gıda market", "mahalle marketi", "hipermarket"]),
        primaryTypes: new Set([
            "asian_grocery_store", "convenience_store", "discount_supermarket", "food_store",
            "general_store", "grocery_store", "hypermarket", "market", "supermarket",
        ]),
        genericTypes: new Set(["store", "establishment", "point_of_interest", "wholesaler"]),
        excludedTypes: new Set([
            "shopping_mall", "farmers_market", "flea_market", "butcher_shop", "bakery",
            "liquor_store", "pet_store", "hardware_store", "home_improvement_store",
        ]),
        namePattern: /(?:market|supermarket|hipermarket|bakkal|gida|grocery)/i,
        excludedNamePattern: /(?:pet\s*market|yapi\s*market|oto\s*market|mobilya|teknoloji|elektronik|kasap|firin|pastane|tekel)/i,
    }),
    bakery: Object.freeze({
        label: "Fırın, Pastane & Tatlı",
        queryTerms: Object.freeze(["fırın", "pastane", "unlu mamuller", "tatlıcı", "baklava", "şekerleme", "pasta evi"]),
        primaryTypes: new Set([
            "bakery", "cake_shop", "candy_store", "chocolate_shop", "confectionery",
            "dessert_shop", "donut_shop", "ice_cream_shop", "pastry_shop",
        ]),
        genericTypes: new Set(["food", "establishment", "point_of_interest", "cafe", "store"]),
        excludedTypes: new Set([
            "restaurant", "fast_food_restaurant", "hamburger_restaurant", "pizza_restaurant",
            "supermarket", "grocery_store", "convenience_store",
        ]),
        namePattern: /(?:firin|pastane|unlu\s*mamuller|tatli|baklava|sekerleme|pasta\s*(?:evi|salonu)|dessert|bakery)/i,
        excludedNamePattern: /(?:restoran|restaurant|burger|pizza|doner|market|bakkal|kasap|kafe|cafe(?!.*(?:pastane|firin)))/i,
    }),
    auto_service: Object.freeze({
        label: "Oto Servis, Bakım & Lastik",
        queryTerms: Object.freeze([
            "oto servis", "özel oto servis", "oto tamir", "araç bakım", "lastikçi",
            "oto elektrik", "kaporta boya", "rot balans", "egzoz servisi",
        ]),
        primaryTypes: new Set(["car_repair", "tire_shop"]),
        genericTypes: new Set(["auto_parts_store", "store", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["car_dealer", "truck_dealer", "car_rental", "car_wash", "gas_station"]),
        namePattern: /(?:oto\s*servis|ozel\s*servis|oto\s*tamir|arac\s*bakim|lastik|oto\s*elektrik|kaporta|rot\s*balans|egzoz|mekanik)/i,
        excludedNamePattern: /(?:oto\s*galeri|rent\s*a\s*car|arac\s*kiralama|oto\s*yikama|akaryakit|benzin|sigorta)/i,
    }),
    pharmacy: Object.freeze({
        label: "Eczane",
        queryTerms: Object.freeze(["eczane", "n\u00f6bet\u00e7i eczane", "mahalle eczanesi", "pharmacy"]),
        primaryTypes: new Set(["pharmacy", "drugstore"]),
        genericTypes: new Set(["health", "store", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["medical_clinic", "hospital", "doctor", "veterinary_care", "pet_store"]),
        namePattern: /(?:eczane|pharmacy)/i,
        excludedNamePattern: /(?:veteriner|hayvan|pet\s*shop|klinik|hastane|medikal)/i,
    }),
    fitness: Object.freeze({
        label: "Spor Salonu & Fitness",
        queryTerms: Object.freeze(["spor salonu", "fitness merkezi", "pilates st\u00fcdyosu", "yoga st\u00fcdyosu", "gym"]),
        primaryTypes: new Set(["gym", "fitness_center", "sports_club", "yoga_studio", "pilates_studio"]),
        genericTypes: new Set(["sports_activity_location", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["beauty_salon", "spa", "physiotherapist", "sports_school", "stadium"]),
        namePattern: /(?:spor\s*salonu|fitness|gym|pilates|yoga|crossfit|body\s*building)/i,
        excludedNamePattern: /(?:guzellik|kuafor|fizyoterapi|hali\s*saha|stadyum|spor\s*malzeme)/i,
    }),
    education: Object.freeze({
        label: "E\u011fitim, Kurs & S\u00fcr\u00fcc\u00fc Kursu",
        queryTerms: Object.freeze(["e\u011fitim kursu", "s\u00fcr\u00fcc\u00fc kursu", "yabanc\u0131 dil kursu", "\u00f6zel okul", "dershane", "mesleki e\u011fitim"]),
        primaryTypes: new Set(["driving_school", "educational_institution", "language_school", "school", "training_center", "tutoring_service", "university", "vocational_school"]),
        genericTypes: new Set(["establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["book_store", "library", "child_care_agency", "sports_school"]),
        namePattern: /(?:egitim|kurs|surucu|dershane|akademi|kolej|okul|etut|dil\s*merkezi)/i,
        excludedNamePattern: /(?:kitabevi|kutuphane|kirtasiye|oyuncak|spor\s*kulubu)/i,
    }),
    fashion: Object.freeze({
        label: "Giyim, Ayakkab\u0131 & Butik",
        queryTerms: Object.freeze(["giyim ma\u011fazas\u0131", "kad\u0131n butik", "erkek giyim", "ayakkab\u0131 ma\u011fazas\u0131", "\u00e7ocuk giyim", "moda evi"]),
        primaryTypes: new Set(["children_clothing_store", "clothing_store", "fashion_accessories_store", "mens_clothing_store", "shoe_store", "womens_clothing_store"]),
        genericTypes: new Set(["store", "establishment", "point_of_interest", "tailor"]),
        excludedTypes: new Set(["furniture_store", "home_goods_store", "jewelry_store", "sporting_goods_store"]),
        namePattern: /(?:giyim|butik|moda|ayakkabi|konfeksiyon|tekstil|kundura)/i,
        excludedNamePattern: /(?:mobilya|dekorasyon|kuyum|spor\s*malzeme|hali|perde)/i,
    }),
    furniture: Object.freeze({
        label: "Mobilya & Ev Dekorasyonu",
        queryTerms: Object.freeze(["mobilya ma\u011fazas\u0131", "ev dekorasyon", "yatak ma\u011fazas\u0131", "ofis mobilyas\u0131", "mutfak mobilyas\u0131"]),
        primaryTypes: new Set(["furniture_store", "home_goods_store", "interior_designer", "mattress_store"]),
        genericTypes: new Set(["store", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["electronics_store", "hardware_store", "home_improvement_store", "general_contractor"]),
        namePattern: /(?:mobilya|dekorasyon|yatak|koltuk|mutfak\s*dolabi|ev\s*tekstili)/i,
        excludedNamePattern: /(?:elektronik|yapi\s*market|hirdavat|insaat|beyaz\s*esya\s*servis)/i,
    }),
    electronics: Object.freeze({
        label: "Elektronik, Telefon & Bilgisayar",
        queryTerms: Object.freeze(["elektronik ma\u011fazas\u0131", "telefon ma\u011fazas\u0131", "bilgisayar ma\u011fazas\u0131", "beyaz e\u015fya ma\u011fazas\u0131", "teknoloji ma\u011fazas\u0131"]),
        primaryTypes: new Set(["appliance_store", "cell_phone_store", "computer_store", "electronics_store"]),
        genericTypes: new Set(["store", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["furniture_store", "home_goods_store", "appliance_repair_service", "car_repair"]),
        namePattern: /(?:elektronik|telefon|bilgisayar|teknoloji|beyaz\s*esya|gsm)/i,
        excludedNamePattern: /(?:mobilya|dekorasyon|tamir\s*servisi|oto\s*elektrik|guvenlik\s*sistemi)/i,
    }),
    construction_supply: Object.freeze({
        label: "Yap\u0131 Market & \u0130n\u015faat Malzemeleri",
        queryTerms: Object.freeze(["yap\u0131 market", "in\u015faat malzemeleri", "h\u0131rdavat", "nalbur", "seramik ma\u011fazas\u0131", "yap\u0131 malzemeleri"]),
        primaryTypes: new Set(["building_materials_store", "hardware_store", "home_improvement_store"]),
        genericTypes: new Set(["store", "wholesaler", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["general_contractor", "architect", "real_estate_agency", "furniture_store"]),
        namePattern: /(?:yapi\s*market|insaat\s*malzeme|hirdavat|nalbur|seramik|yapi\s*malzeme)/i,
        excludedNamePattern: /(?:mimarlik|muteahhit|taahhut|emlak|mobilya|dekorasyon\s*ofisi)/i,
    }),
    florist_stationery: Object.freeze({
        label: "\u00c7i\u00e7ek\u00e7i, Hediyelik & K\u0131rtasiye",
        queryTerms: Object.freeze(["\u00e7i\u00e7ek\u00e7i", "hediyelik e\u015fya", "k\u0131rtasiye", "kitabevi", "organizasyon \u00e7i\u00e7e\u011fi"]),
        primaryTypes: new Set(["book_store", "florist", "gift_shop", "stationery_store"]),
        genericTypes: new Set(["store", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["funeral_home", "supermarket", "clothing_store", "garden_center"]),
        namePattern: /(?:cicek|florist|hediyelik|kirtasiye|kitabevi)/i,
        excludedNamePattern: /(?:cenaze|mezarlik|market|giyim|peyzaj|fidanlik)/i,
    }),
    cleaning_laundry: Object.freeze({
        label: "Temizlik, \u00c7ama\u015f\u0131rhane & Kuru Temizleme",
        queryTerms: Object.freeze(["kuru temizleme", "\u00e7ama\u015f\u0131rhane", "temizlik \u015firketi", "hal\u0131 y\u0131kama", "ev temizli\u011fi"]),
        primaryTypes: new Set(["cleaning_service", "dry_cleaner", "laundry", "laundry_service"]),
        genericTypes: new Set(["service", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["car_wash", "janitorial_service", "plumber"]),
        namePattern: /(?:kuru\s*temizleme|camasirhane|temizlik|hali\s*yikama|laundry)/i,
        excludedNamePattern: /(?:oto\s*yikama|arac\s*temizlik|kanal\s*acma|tesisat|cop\s*toplama)/i,
    }),
    event_wedding: Object.freeze({
        label: "D\u00fc\u011f\u00fcn Salonu & Organizasyon",
        queryTerms: Object.freeze(["d\u00fc\u011f\u00fcn salonu", "organizasyon \u015firketi", "davet salonu", "nikah salonu", "etkinlik mekan\u0131"]),
        primaryTypes: new Set(["banquet_hall", "event_venue", "wedding_service", "wedding_venue"]),
        genericTypes: new Set(["service", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["restaurant", "hotel", "night_club", "community_center"]),
        namePattern: /(?:dugun\s*salonu|organizasyon|davet\s*salonu|nikah|etkinlik\s*mekani)/i,
        excludedNamePattern: /(?:restoran|otel|gece\s*kulubu|belediye\s*kultur|dernek)/i,
    }),
    professional_services: Object.freeze({
        label: "Avukat, Muhasebe & Dan\u0131\u015fmanl\u0131k",
        queryTerms: Object.freeze(["avukat", "hukuk b\u00fcrosu", "mali m\u00fc\u015favir", "muhasebe b\u00fcrosu", "i\u015f dan\u0131\u015fmanl\u0131\u011f\u0131"]),
        primaryTypes: new Set(["accounting", "consultant", "lawyer", "legal_services", "tax_consultant"]),
        genericTypes: new Set(["corporate_office", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["real_estate_agency", "insurance_agency", "bank", "local_government_office"]),
        namePattern: /(?:avukat|hukuk|muhasebe|mali\s*musavir|danismanlik|consulting)/i,
        excludedNamePattern: /(?:emlak|gayrimenkul|sigorta|banka|belediye|kamu)/i,
    }),
    photography: Object.freeze({
        label: "Foto\u011fraf\u00e7\u0131 & Prod\u00fcksiyon",
        queryTerms: Object.freeze(["foto\u011fraf\u00e7\u0131", "foto\u011fraf st\u00fcdyosu", "d\u00fc\u011f\u00fcn foto\u011fraf\u00e7\u0131s\u0131", "video prod\u00fcksiyon", "reklam foto\u011fraf\u00e7\u0131s\u0131"]),
        primaryTypes: new Set(["photo_shop", "photographer", "photography_service", "portrait_studio"]),
        genericTypes: new Set(["service", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["electronics_store", "camera_store", "movie_theater", "event_venue"]),
        namePattern: /(?:fotograf|photo|studyo|produksiyon|video\s*cekimi)/i,
        excludedNamePattern: /(?:kamera\s*magaza|elektronik|sinema|dugun\s*salonu)/i,
    }),
    gas_station: Object.freeze({
        label: "Akaryak\u0131t \u0130stasyonu",
        queryTerms: Object.freeze(["akaryak\u0131t istasyonu", "benzin istasyonu", "petrol istasyonu", "LPG istasyonu"]),
        primaryTypes: new Set(["gas_station"]),
        genericTypes: new Set(["establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["car_repair", "car_wash", "electric_vehicle_charging_station", "convenience_store"]),
        namePattern: /(?:akaryakit|benzin|petrol|lpg|opet|shell|total|moil|aytemiz)/i,
        excludedNamePattern: /(?:oto\s*servis|tamir|oto\s*yikama|sarj\s*istasyonu|market)/i,
    }),
    logistics: Object.freeze({
        label: "Kargo, Kurye & Lojistik",
        queryTerms: Object.freeze(["kargo \u015fubesi", "kurye hizmeti", "lojistik \u015firketi", "nakliyat", "ta\u015f\u0131mac\u0131l\u0131k"]),
        primaryTypes: new Set(["courier_service", "freight_forwarding_service", "logistics_service", "moving_company", "shipping_service", "trucking_company"]),
        genericTypes: new Set(["transportation_service", "corporate_office", "establishment", "point_of_interest", "service"]),
        excludedTypes: new Set(["taxi_service", "car_rental", "travel_agency", "bus_station"]),
        namePattern: /(?:kargo|kurye|lojistik|nakliyat|tasimacilik|shipping)/i,
        excludedNamePattern: /(?:taksi|rent\s*a\s*car|turizm\s*acentesi|otogar)/i,
    }),
    car_wash: Object.freeze({
        label: "Oto Y\u0131kama & Detayl\u0131 Temizlik",
        queryTerms: Object.freeze(["oto y\u0131kama", "ara\u00e7 y\u0131kama", "detayl\u0131 oto temizlik", "oto kuaf\u00f6r", "car detailing"]),
        primaryTypes: new Set(["car_detailing_service", "car_wash"]),
        genericTypes: new Set(["service", "establishment", "point_of_interest"]),
        excludedTypes: new Set(["car_repair", "car_dealer", "gas_station", "laundry"]),
        namePattern: /(?:oto\s*yikama|arac\s*yikama|oto\s*kuafor|detayli\s*temizlik|car\s*detailing)/i,
        excludedNamePattern: /(?:oto\s*servis|tamir|oto\s*galeri|akaryakit|hali\s*yikama)/i,
    }),
});

export const SECTOR_ALIASES = Object.freeze({
    restaurant: Object.freeze(["restaurant", "restoran"]),
    cafe: Object.freeze(["cafe", "kafe", "coffee", "kahve", "coffee_shop"]),
    beauty: Object.freeze(["beauty", "guzellik", "guzellik_kuafor", "guzellik_&_kuafor", "kuafor", "beauty_salon", "hair_salon"]),
    real_estate: Object.freeze(["real_estate", "emlak", "emlak_ofisi", "emlak_gayrimenkul", "emlak_&_gayrimenkul", "real_estate_agency"]),
    lodging: Object.freeze(["lodging", "otel", "otel_konaklama", "otel_&_konaklama", "hotel", "konaklama"]),
    car_rental: Object.freeze(["car_rental", "arac_kiralama", "oto_kiralama", "rent_a_car"]),
    healthcare: Object.freeze(["healthcare", "saglik", "klinik", "klinik_saglik", "klinik_&_saglik", "health"]),
    grocery: Object.freeze(["grocery", "market", "market_bakkal", "market_&_bakkal", "supermarket", "bakkal"]),
    bakery: Object.freeze(["bakery", "firin", "pastane", "firin_pastane_tatli", "firin,_pastane_&_tatli"]),
    auto_service: Object.freeze(["auto_service", "oto_servis", "oto_servis_bakim_lastik", "oto_servis,_bakim_&_lastik", "car_repair", "tire_shop"]),
    pharmacy: Object.freeze(["pharmacy", "eczane", "drugstore"]),
    fitness: Object.freeze(["fitness", "spor_salonu", "spor_salonu_&_fitness", "gym"]),
    education: Object.freeze(["education", "egitim", "egitim_kurs_surucu_kursu", "egitim,_kurs_&_surucu_kursu", "driving_school"]),
    fashion: Object.freeze(["fashion", "giyim", "giyim_ayakkabi_butik", "giyim,_ayakkabi_&_butik", "clothing_store"]),
    furniture: Object.freeze(["furniture", "mobilya", "mobilya_ev_dekorasyonu", "mobilya_&_ev_dekorasyonu", "furniture_store"]),
    electronics: Object.freeze(["electronics", "elektronik", "elektronik_telefon_bilgisayar", "elektronik,_telefon_&_bilgisayar", "electronics_store"]),
    construction_supply: Object.freeze(["construction_supply", "yapi_market", "insaat_malzemeleri", "yapi_market_&_insaat_malzemeleri", "hardware_store"]),
    florist_stationery: Object.freeze(["florist_stationery", "cicekci", "hediyelik", "kirtasiye", "cicekci,_hediyelik_&_kirtasiye", "florist"]),
    cleaning_laundry: Object.freeze(["cleaning_laundry", "temizlik", "camasirhane", "kuru_temizleme", "temizlik,_camasirhane_&_kuru_temizleme", "laundry"]),
    event_wedding: Object.freeze(["event_wedding", "dugun_salonu", "organizasyon", "dugun_salonu_&_organizasyon", "wedding_venue"]),
    professional_services: Object.freeze(["professional_services", "avukat", "muhasebe", "danismanlik", "avukat,_muhasebe_&_danismanlik", "lawyer"]),
    photography: Object.freeze(["photography", "fotografci", "produksiyon", "fotografci_&_produksiyon", "photographer"]),
    gas_station: Object.freeze(["gas_station", "akaryakit", "akaryakit_istasyonu", "benzin_istasyonu"]),
    logistics: Object.freeze(["logistics", "kargo", "kurye", "lojistik", "kargo,_kurye_&_lojistik", "courier_service"]),
    car_wash: Object.freeze(["car_wash", "oto_yikama", "detayli_temizlik", "oto_yikama_&_detayli_temizlik"]),
});

export const SEARCH_FIELDS = [
    "places.id", "places.displayName", "places.formattedAddress", "places.primaryType", "places.location",
      "places.nationalPhoneNumber", "places.internationalPhoneNumber", "places.websiteUri", "places.googleMapsUri",
      "places.rating", "places.userRatingCount", "places.regularOpeningHours", "places.photos",
      "places.businessStatus", "nextPageToken",
].join(",");
const DETAIL_FIELDS = [
    "id", "displayName", "formattedAddress", "primaryType", "nationalPhoneNumber",
      "internationalPhoneNumber", "websiteUri", "googleMapsUri", "location", "rating",
      "userRatingCount", "regularOpeningHours", "photos", "businessStatus",
].join(",");
const ORDU_RECTANGLE = {
    rectangle: {
        low: { latitude: 40.35, longitude: 36.7 },
        high: { latitude: 41.25, longitude: 38.2 },
    },
};
const SOCIAL_HOSTS = new Map([
    ["instagram.com", "instagram"], ["facebook.com", "facebook"],
    ["youtube.com", "youtube"], ["youtu.be", "youtube"],
    ["tiktok.com", "tiktok"], ["linkedin.com", "linkedin"],
    ["twitter.com", "twitter"], ["x.com", "twitter"],
]);

export function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleCaseBusinessName(value) {
    const normalized = String(value ?? "").trim().split(/(\s+)/).map((part) => (
        /[ÇĞİÖŞÜ]/.test(part) ? part.toLocaleLowerCase("tr-TR") : part.toLowerCase()
    )).join("");
    return normalized.replace(
        /(^|[\s/()&+.'-])(\p{L})/gu,
        (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("tr-TR")}`,
    );
}

export function buildGooglePhotoProfileFields(place) {
    const googlePlacePhotoAvailable = Array.isArray(place?.photos) && place.photos.length > 0;
    const placeId = typeof place?.id === "string" ? place.id.trim() : "";
    return {
        googlePlacePhotoAvailable,
        logo: googlePlacePhotoAvailable && placeId
            ? `/api/google-places/photo/${encodeURIComponent(placeId)}`
            : null,
    };
}

export function hasRequiredContactAndLocation(place) {
    if (place?.businessStatus && place.businessStatus !== "OPERATIONAL") return false;
    const phone = place?.internationalPhoneNumber ?? place?.nationalPhoneNumber ?? "";
    const phoneDigits = String(phone).replace(/\D/g, "");
    const latitude = place?.location?.latitude;
    const longitude = place?.location?.longitude;
    return phoneDigits.length >= 10
        && phoneDigits.length <= 15
        && Number.isFinite(latitude)
        && latitude >= -90
        && latitude <= 90
        && Number.isFinite(longitude)
        && longitude >= -180
        && longitude <= 180;
}

function sectorDefinition(sectorKey) {
    const definition = SECTOR_DEFINITIONS[sectorKey];
    if (!definition) throw new Error(`unknown_sector:${sectorKey}`);
    return definition;
}

function canonicalSectorKey(value) {
    const normalized = normalizeText(value).replace(/\s+/g, "_");
    for (const [sectorKey, aliases] of Object.entries(SECTOR_ALIASES)) {
        if (aliases.includes(normalized)) return sectorKey;
    }
    return normalized;
}

export function isSectorSearchResult(sectorKey, place) {
    const definition = sectorDefinition(sectorKey);
    const name = place?.displayName?.text ?? place?.displayName ?? "";
    const normalizedName = normalizeText(name);
    const primaryType = place?.primaryType ?? "";
    if (!name
        || definition.excludedTypes.has(primaryType)
        || definition.excludedNamePattern.test(name)
        || definition.excludedNamePattern.test(normalizedName)) return false;
    if (definition.primaryTypes.has(primaryType)) return true;
    if (primaryType && !definition.genericTypes.has(primaryType)) return false;
    return definition.namePattern.test(name);
}

function resolveDistrict(address) {
    const normalized = normalizeText(address);
    if (!/(^| )ordu( turkiye)?$/.test(normalized)) return null;
    const beforeProvince = normalized.slice(0, normalized.lastIndexOf(" ordu"));
    if (beforeProvince.includes("ordu merkez")) return "Altınordu";
    let selected = null;
    for (const district of ORDU_DISTRICTS) {
        const index = beforeProvince.lastIndexOf(normalizeText(district));
        if (index >= 0 && (!selected || index > selected.index)) selected = { district, index };
    }
    return selected?.district ?? null;
}

function neighborhood(address) {
    return normalizeText(String(address ?? "").split(",", 1)[0]);
}

function identityValues(business) {
    return [business.sourceRef, business.googlePlaceId].filter(Boolean);
}

function matchScore(place, business) {
    let score = 0;
    if (identityValues(business).includes(place.id)) score += 1_000;
    const placeName = normalizeText(place.displayName);
    const businessName = normalizeText(business.name);
    if (placeName && placeName === businessName) score += 200;
    else if (placeName && businessName && (placeName.includes(businessName) || businessName.includes(placeName))) score += 100;
    const area = neighborhood(place.formattedAddress);
    if (area && normalizeText(business.slug).includes(area)) score += 120;
    if (area && normalizeText(business.address).includes(area)) score += 120;
    return score;
}

export function assignPlacesToExisting(places, existingBusinesses) {
    const assignments = new Map();
    const remaining = new Map(existingBusinesses.map((business) => [business.id, business]));
    const ordered = [...places].sort((left, right) => {
        const leftHasIdentity = existingBusinesses.some((business) => identityValues(business).includes(left.id));
        const rightHasIdentity = existingBusinesses.some((business) => identityValues(business).includes(right.id));
        if (leftHasIdentity !== rightHasIdentity) return leftHasIdentity ? -1 : 1;
        return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
            || neighborhood(left.formattedAddress).localeCompare(neighborhood(right.formattedAddress));
    });
    for (const place of ordered) {
        const candidates = [...remaining.values()]
            .map((business) => ({ business, score: matchScore(place, business) }))
            .filter(({ score }) => score >= 320)
            .sort((left, right) => right.score - left.score || String(left.business.id).localeCompare(String(right.business.id)));
        const selected = candidates[0]?.business;
        if (!selected) continue;
        assignments.set(place.id, selected);
        remaining.delete(selected.id);
    }
    return { assignments, unmatchedExisting: [...remaining.values()] };
}

export function filterAlreadyPublishedPlaces(places, identitySectors, sectorKey) {
    return places.filter((place) => {
        const publishedSector = canonicalSectorKey(identitySectors.get(place.id));
        return !publishedSector || publishedSector === canonicalSectorKey(sectorKey);
    });
}

export function parseArgs(argv) {
    const sectorOption = argv.find((option) => option.startsWith("--sector="));
    if (!sectorOption) throw new Error("sector_required");
    const sectorKey = sectorOption.slice("--sector=".length).trim();
    sectorDefinition(sectorKey);
    const knownOptions = new Set([sectorOption, "--apply", "--replace-unclaimed"]);
    for (const option of argv) if (!knownOptions.has(option)) throw new Error(`unknown_option:${option}`);
    const apply = argv.includes("--apply");
    const replaceUnclaimed = argv.includes("--replace-unclaimed");
    if (replaceUnclaimed && !apply) throw new Error("replace_requires_apply");
    return { sectorKey, apply, replaceUnclaimed };
}

export async function retryTransientOperation(operation, options = {}) {
    const maxAttempts = options.maxAttempts ?? 5;
    const baseDelayMs = options.baseDelayMs ?? 1_000;
    const sleep = options.sleep ?? ((delay) => new Promise((resolve) => setTimeout(resolve, delay)));
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            const status = Number(error?.status);
            const isTransient = error?.name === "AbortError"
                || error instanceof TypeError
                || status === 429
                || (status >= 500 && status <= 599);
            if (!isTransient || attempt === maxAttempts) throw error;
            await sleep(baseDelayMs * (2 ** (attempt - 1)));
        }
    }
    throw new Error("retry_attempts_exhausted");
}

async function googleRequest(apiKey, path, fieldMask, init = {}) {
    return retryTransientOperation(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
            const response = await fetch(`https://places.googleapis.com/v1${path}`, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask": fieldMask,
                    ...(init.headers ?? {}),
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                const error = new Error(`places_http_${response.status}`);
                error.status = response.status;
                throw error;
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    });
}

async function searchTask(apiKey, district, term) {
    const places = [];
    let pageToken = null;
    let page = 0;
    do {
        const payload = await googleRequest(apiKey, "/places:searchText", SEARCH_FIELDS, {
            method: "POST",
            body: JSON.stringify({
                textQuery: `${term} ${district} Ordu`,
                languageCode: "tr",
                regionCode: "tr",
                locationRestriction: ORDU_RECTANGLE,
                ...(pageToken ? { pageToken } : {}),
            }),
        });
        places.push(...(payload.places ?? []));
        pageToken = payload.nextPageToken ?? null;
        page += 1;
    } while (pageToken && page < 3);
    return places;
}

async function mapConcurrent(items, concurrency, mapper) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await mapper(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
    return results;
}

export async function discoverPlaces(apiKey, sectorKey) {
    const definition = sectorDefinition(sectorKey);
    const tasks = ORDU_DISTRICTS.flatMap((district) => definition.queryTerms.map((term) => ({ district, term })));
    const batches = await mapConcurrent(tasks, 3, ({ district, term }) => searchTask(apiKey, district, term));
    const discovered = new Map();
    for (const batch of batches) {
        for (const place of batch) {
            if (!place.id || discovered.has(place.id) || !isSectorSearchResult(sectorKey, place)) continue;
            const district = resolveDistrict(place.formattedAddress);
            if (!district) continue;
            discovered.set(place.id, { id: place.id, district, search: place });
        }
    }
    return [...discovered.values()];
}

function normalizeEligiblePlace(sectorKey, ref, place) {
    const displayName = place.displayName?.text ?? ref.search.displayName?.text ?? "";
    const formattedAddress = place.formattedAddress ?? ref.search.formattedAddress ?? "";
    if (!isSectorSearchResult(sectorKey, {
        displayName: { text: displayName },
        primaryType: place.primaryType ?? ref.search.primaryType,
    })) return null;
    const district = resolveDistrict(formattedAddress);
    if (!district) return null;
    const normalizedPlace = { ...place, district, displayName, formattedAddress };
    return hasRequiredContactAndLocation(normalizedPlace) ? normalizedPlace : null;
}

export async function getPlaceDetails(apiKey, sectorKey, ref) {
    const hydratedSearchPlace = normalizeEligiblePlace(sectorKey, ref, ref.search);
    if (hydratedSearchPlace) return hydratedSearchPlace;
    const place = await googleRequest(
        apiKey,
        `/places/${encodeURIComponent(ref.id)}?languageCode=tr&regionCode=tr`,
        DETAIL_FIELDS,
        { method: "GET" },
    );
    return normalizeEligiblePlace(sectorKey, ref, place);
}

function socialField(url) {
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const [host, field] of SOCIAL_HOSTS) {
        if (hostname === host || hostname.endsWith(`.${host}`)) return field;
    }
    return null;
}

async function websiteSocialLinks(website) {
    if (!website) return {};
    let parse;
    try {
        ({ parse } = await import("node-html-parser"));
    } catch {
        return {};
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
        const source = new URL(website);
        const response = await fetch(source, { redirect: "follow", signal: controller.signal });
        if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return {};
        const links = {};
        const document = parse((await response.text()).slice(0, 1_000_000));
        for (const anchor of document.querySelectorAll("a[href]")) {
            try {
                const url = new URL(anchor.getAttribute("href"), source);
                const field = socialField(url);
                if (field && !links[field]) links[field] = url.toString();
            } catch { /* Ignore malformed external links. */ }
        }
        return links;
    } catch {
        return {};
    } finally {
        clearTimeout(timeout);
    }
}

async function enrichSocialLinks(place) {
    const socialLinks = {
        ...(place.websiteUri ? { website: place.websiteUri } : {}),
        ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
        ...(await websiteSocialLinks(place.websiteUri)),
    };
    return { ...place, socialLinks };
}

function stableBusinessId(placeId) {
    return `gpl_${createHash("sha256").update(placeId).digest("hex").slice(0, 24)}`;
}

function slugify(value) {
    return normalizeText(value).replace(/\s+/g, "-").replace(/^-|-$/g, "") || "ordu-isletme";
}

function uniqueSlug(place, usedSlugs) {
    const candidates = [
        slugify(place.displayName),
        slugify(`${place.displayName} ${neighborhood(place.formattedAddress)}`),
        slugify(`${place.displayName} ${place.district}`),
    ];
    for (const candidate of candidates) {
        if (!usedSlugs.has(candidate)) {
            usedSlugs.add(candidate);
            return candidate;
        }
    }
    const fallback = `${candidates[0]}-${createHash("sha256").update(place.id).digest("hex").slice(0, 7)}`;
    usedSlugs.add(fallback);
    return fallback;
}

async function loadExisting(client, sectorKey) {
    const aliases = SECTOR_ALIASES[sectorKey] ?? [sectorKey];
    const result = await client.query(`
        SELECT business.id, business.slug, business.name, business.address, business.lat, business.lng,
               discovery.source_ref AS "sourceRef",
               business.legacy_source->>'googlePlaceId' AS "googlePlaceId"
        FROM businesses business
        LEFT JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
        WHERE lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = ANY($1::text[])
        ORDER BY business.created_at ASC NULLS LAST, business.id ASC
    `, [aliases]);
    return result.rows;
}

async function loadGoogleIdentitySectors(client) {
    const result = await client.query(`
        SELECT identity.source_ref AS "sourceRef", lower(COALESCE(identity.industry_id, '')) AS "sectorKey"
        FROM (
            SELECT discovery.source_ref, business.industry_id
            FROM business_discovery_profiles discovery
            INNER JOIN businesses business ON business.id = discovery.business_id
            WHERE discovery.source_type = 'google_places' AND NULLIF(BTRIM(discovery.source_ref), '') IS NOT NULL
            UNION
            SELECT business.legacy_source->>'googlePlaceId', business.industry_id
            FROM businesses business
            WHERE NULLIF(BTRIM(business.legacy_source->>'googlePlaceId'), '') IS NOT NULL
        ) identity
    `);
    return new Map(result.rows.map((row) => [row.sourceRef, row.sectorKey]));
}

async function loadUsedSlugs(client) {
    const result = await client.query("SELECT slug FROM businesses WHERE NULLIF(BTRIM(slug), '') IS NOT NULL");
    return new Set(result.rows.map(({ slug }) => slug));
}

export async function removeInvalidImportedBusinesses(client) {
    const result = await client.query(`
        WITH invalid_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL AND business.plan_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.business_id = business.id)
              AND (
                    NULLIF(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g'), '') IS NULL
                    OR char_length(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g')) NOT BETWEEN 10 AND 15
                    OR business.lat IS NULL OR business.lat NOT BETWEEN -90 AND 90
                    OR business.lng IS NULL OR business.lng NOT BETWEEN -180 AND 180
              )
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery USING invalid_imports invalid
            WHERE discovery.business_id = invalid.id RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business USING invalid_imports invalid
            WHERE business.id = invalid.id RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `);
    return result.rowCount ?? result.rows.length;
}

export async function removeReplaceableImportedSectorBusinesses(client, sectorKey) {
    sectorDefinition(sectorKey);
    const result = await client.query(`
        WITH replaceable_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND lower(COALESCE(business.industry_id, '')) = $1
              AND lower(COALESCE(business.city, '')) = 'ordu'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL AND business.plan_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.business_id = business.id)
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery USING replaceable_imports replaceable
            WHERE discovery.business_id = replaceable.id RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business USING replaceable_imports replaceable
            WHERE business.id = replaceable.id RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `, [sectorKey]);
    return result.rowCount ?? result.rows.length;
}

export async function upsertPlace(client, sectorKey, place, business, usedSlugs) {
    const definition = sectorDefinition(sectorKey);
    const businessId = business?.id ?? stableBusinessId(place.id);
    const slug = business?.slug ?? uniqueSlug(place, usedSlugs);
    const name = titleCaseBusinessName(place.displayName);
    const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
    const hours = place.regularOpeningHours?.weekdayDescriptions ?? [];
    const photoFields = buildGooglePhotoProfileFields(place);
    const socialLinks = place.socialLinks ?? {
        ...(place.websiteUri ? { website: place.websiteUri } : {}),
        ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
    };
    const legacy = {
        googlePlaceId: place.id,
        googlePlacePhotoAvailable: photoFields.googlePlacePhotoAvailable,
        address: place.formattedAddress ?? null,
        phone,
        mapsUrl: place.googleMapsUri ?? null,
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        workingHours: hours,
        socialLinks,
    };
    await client.query(`
        INSERT INTO businesses (
            id, slug, name, phone, whatsapp, status, industry_id, industry_label, active_module,
            address, maps_url, social_links, show_hours, working_hours, city, district, lat, lng,
            rating, review_count, is_verified, source, legacy_source, logo, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $4, 'active', $5, $6, NULL,
            $7, $8, $9::jsonb, $10, $11::jsonb, 'Ordu', $12, $13, $14,
            $15, $16, true, 'google_places_verified_import', $17::jsonb, $18, now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, businesses.phone),
            whatsapp = COALESCE(EXCLUDED.whatsapp, businesses.whatsapp),
            status = 'active', industry_id = EXCLUDED.industry_id, industry_label = EXCLUDED.industry_label,
            active_module = CASE WHEN businesses.package_id IS NULL AND businesses.plan_id IS NULL THEN NULL ELSE businesses.active_module END,
            address = EXCLUDED.address, maps_url = EXCLUDED.maps_url,
            social_links = COALESCE(businesses.social_links, '{}'::jsonb) || EXCLUDED.social_links,
            show_hours = EXCLUDED.show_hours, working_hours = EXCLUDED.working_hours,
            city = 'Ordu', district = EXCLUDED.district, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
            rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, is_verified = true,
            source = CASE
                WHEN businesses.source IS NULL OR businesses.source = 'google_places_verified_import' THEN EXCLUDED.source
                ELSE businesses.source
            END,
            legacy_source = COALESCE(businesses.legacy_source, '{}'::jsonb) || EXCLUDED.legacy_source,
            logo = CASE
                WHEN NULLIF(BTRIM(businesses.logo), '') IS NOT NULL
                 AND businesses.logo NOT LIKE '/api/google-places/photo/%'
                THEN businesses.logo
                ELSE EXCLUDED.logo
            END,
            updated_at = now()
    `, [
        businessId, slug, name, phone, sectorKey, definition.label,
        place.formattedAddress ?? null, place.googleMapsUri ?? null, JSON.stringify(socialLinks),
        hours.length > 0, JSON.stringify(hours), place.district,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
        place.rating ?? null, place.userRatingCount ?? 0, JSON.stringify(legacy), photoFields.logo,
    ]);
    await client.query(`
        INSERT INTO business_discovery_profiles (
            business_id, source_type, source_ref, source_confidence, city, district, address,
            latitude, longitude, claim_state, discover_status, metadata, created_at, updated_at
        ) VALUES (
            $1, 'google_places', $2, 1, 'Ordu', $3, $4, $5, $6,
            'unclaimed', 'published', jsonb_build_object('sectorKey', $7::text, 'categoryLabel', $8::text), now(), now()
        )
        ON CONFLICT (business_id) DO UPDATE SET
            source_type = 'google_places', source_ref = EXCLUDED.source_ref, source_confidence = 1,
            city = 'Ordu', district = EXCLUDED.district, address = EXCLUDED.address,
            latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
            discover_status = 'published',
            metadata = COALESCE(business_discovery_profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata,
            updated_at = now()
    `, [
        businessId, place.id, place.district, place.formattedAddress ?? null,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
        sectorKey, definition.label,
    ]);
    return { businessId, slug, name, district: place.district, placeId: place.id, existed: Boolean(business) };
}

export function buildSectorQualityPreview(places, sampleLimit = 20) {
    const primaryTypeCounts = Object.fromEntries(
        [...places.reduce((counts, place) => {
            const primaryType = place.primaryType || "unknown";
            counts.set(primaryType, (counts.get(primaryType) ?? 0) + 1);
            return counts;
        }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)),
    );
    const sampleBusinesses = [...places]
        .sort((left, right) => (right.userRatingCount ?? 0) - (left.userRatingCount ?? 0)
            || normalizeText(left.displayName).localeCompare(normalizeText(right.displayName)))
        .slice(0, sampleLimit)
        .map((place) => ({
            id: place.id,
            name: place.displayName,
            primaryType: place.primaryType ?? null,
            district: place.district,
            reviewCount: place.userRatingCount ?? 0,
        }));
    return { primaryTypeCounts, sampleBusinesses };
}

export async function runSectorSync(options = {}) {
    const sectorKey = options.sectorKey?.trim();
    const definition = sectorDefinition(sectorKey);
    const apply = options.apply ?? false;
    const replaceUnclaimed = options.replaceUnclaimed ?? false;
    const apiKey = options.apiKey?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim();
    const connectionString = options.connectionString?.trim()
        || process.env.DATABASE_URL?.trim()
        || process.env.POSTGRES_URL?.trim();
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY_required");
    if (!connectionString) throw new Error("DATABASE_URL_or_POSTGRES_URL_required");

    const refs = await discoverPlaces(apiKey, sectorKey);
    const details = await mapConcurrent(refs, 5, (ref) => getPlaceDetails(apiKey, sectorKey, ref));
    const eligible = details.filter(Boolean);
    const enriched = await mapConcurrent(eligible, 5, enrichSocialLinks);

    const db = new pg.Client({ connectionString });
    await db.connect();
    if (apply) await db.query("BEGIN");
    try {
        const removedForReplacement = replaceUnclaimed
            ? await removeReplaceableImportedSectorBusinesses(db, sectorKey)
            : 0;
        const removedInvalid = apply ? await removeInvalidImportedBusinesses(db) : 0;
        const identitySectors = await loadGoogleIdentitySectors(db);
        const places = filterAlreadyPublishedPlaces(enriched, identitySectors, sectorKey);
        const existing = await loadExisting(db, sectorKey);
        const { assignments, unmatchedExisting } = assignPlacesToExisting(places, existing);
        const photoAvailable = places.filter((place) => buildGooglePhotoProfileFields(place).googlePlacePhotoAvailable).length;
        const qualityPreview = buildSectorQualityPreview(places);
        const summary = {
            sectorKey,
            sectorLabel: definition.label,
            mode: apply ? "apply" : "dry-run",
            searchedDistricts: ORDU_DISTRICTS.length,
            searchQueries: ORDU_DISTRICTS.length * definition.queryTerms.length,
            candidateRefs: refs.length,
            eligibleBeforeIdentityCheck: enriched.length,
            skippedExistingOtherSector: enriched.length - places.length,
            eligibleBusinesses: places.length,
            photoAvailable,
            photoCoveragePercent: places.length ? Math.round((photoAvailable / places.length) * 10_000) / 100 : 0,
            ...qualityPreview,
            eligibleByDistrict: Object.fromEntries(ORDU_DISTRICTS.map((district) => [
                district,
                places.filter((place) => place.district === district).length,
            ])),
            existing: existing.length,
            matched: assignments.size,
            newBusinesses: places.length - assignments.size,
            removedInvalid,
            removedForReplacement,
            unmatchedExisting: unmatchedExisting.map(({ id, slug, name }) => ({ id, slug, name })),
        };
        if (!apply) return summary;

        const usedSlugs = await loadUsedSlugs(db);
        const updates = [];
        for (const place of places) {
            updates.push(await upsertPlace(db, sectorKey, place, assignments.get(place.id), usedSlugs));
        }
        const duplicates = await db.query(`
            SELECT source_ref, count(*)::int AS count
            FROM business_discovery_profiles
            WHERE source_type = 'google_places' AND source_ref IS NOT NULL
            GROUP BY source_ref HAVING count(*) > 1
        `);
        if (duplicates.rows.length) throw new Error("duplicate_google_place_identity_after_sync");
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_business_discovery_profiles_google_place_unique
            ON business_discovery_profiles (source_ref)
            WHERE source_type = 'google_places' AND source_ref IS NOT NULL
        `);
        await db.query("COMMIT");
        return {
            ...summary,
            updated: updates.filter((entry) => entry.existed).length,
            inserted: updates.filter((entry) => !entry.existed).length,
        };
    } catch (error) {
        if (apply) await db.query("ROLLBACK");
        throw error;
    } finally {
        await db.end();
    }
}

async function main() {
    const command = parseArgs(process.argv.slice(2));
    const summary = await runSectorSync(command);
    console.log(JSON.stringify(summary));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main().catch((error) => {
        console.error(error instanceof Error ? error.message : "ordu_sector_sync_failed");
        process.exitCode = 1;
    });
}
