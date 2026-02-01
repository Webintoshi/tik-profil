// Araç Marka ve Model Kalıpları
// Türkiye'de popüler araçlar

export interface VehicleBrand {
    brand: string;
    models: string[];
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
    { brand: "BMW", models: ["1 Serisi", "2 Serisi", "3 Serisi", "4 Serisi", "5 Serisi", "X1", "X3", "X5"] },
    { brand: "Mercedes", models: ["A Serisi", "C Serisi", "E Serisi", "CLA", "GLA", "GLC", "GLE"] },
    { brand: "Audi", models: ["A1", "A3", "A4", "A5", "Q2", "Q3", "Q5"] },
    { brand: "Volkswagen", models: ["Polo", "Golf", "Passat", "Tiguan", "T-Roc", "Transporter"] },
    { brand: "Fiat", models: ["Egea", "Egea Cross", "500", "500X", "Doblo", "Fiorino"] },
    { brand: "Renault", models: ["Clio", "Megane", "Taliant", "Captur", "Duster", "Kangoo"] },
    { brand: "Hyundai", models: ["i10", "i20", "Bayon", "Kona", "Tucson"] },
    { brand: "Toyota", models: ["Yaris", "Corolla", "C-HR", "RAV4", "Hilux"] },
    { brand: "Ford", models: ["Fiesta", "Focus", "Kuga", "Puma", "Transit", "Tourneo"] },
    { brand: "Dacia", models: ["Sandero", "Logan", "Duster", "Jogger"] },
    { brand: "Peugeot", models: ["208", "308", "3008", "5008", "Rifter"] },
    { brand: "Citroen", models: ["C3", "C4", "C4 Cactus", "Berlingo"] },
    { brand: "Opel", models: ["Corsa", "Astra", "Crossland", "Grandland"] },
    { brand: "Seat", models: ["Ibiza", "Leon", "Arona", "Ateca"] },
    { brand: "Skoda", models: ["Fabia", "Scala", "Octavia", "Karoq", "Kodiaq"] },
    { brand: "Honda", models: ["Jazz", "Civic", "HR-V", "CR-V"] },
    { brand: "Nissan", models: ["Micra", "Juke", "Qashqai", "X-Trail"] },
    { brand: "Kia", models: ["Picanto", "Rio", "Stonic", "Sportage"] },
    { brand: "Mazda", models: ["2", "3", "CX-3", "CX-5"] },
    { brand: "Suzuki", models: ["Swift", "Baleno", "Vitara", "S-Cross"] },
];

export const VEHICLE_COLORS = [
    "Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", 
    "Mavi", "Yeşil", "Turuncu", "Sarı", "Kahverengi"
];

export const FUEL_TYPES = [
    { value: "benzin", label: "Benzin" },
    { value: "dizel", label: "Dizel" },
    { value: "elektrik", label: "Elektrik" },
    { value: "hibrit", label: "Hibrit" },
    { value: "lpg", label: "LPG" },
];

export const TRANSMISSION_TYPES = [
    { value: "manuel", label: "Manuel" },
    { value: "otomatik", label: "Otomatik" },
];

export const VEHICLE_CATEGORIES = [
    { id: "ekonomi", name: "Ekonomi", icon: "Car" },
    { id: "orta", name: "Orta Sınıf", icon: "Car" },
    { id: "suv", name: "SUV", icon: "Truck" },
    { id: "luks", name: "Lüks", icon: "Gem" },
    { id: "ticari", name: "Ticari", icon: "Truck" },
];
