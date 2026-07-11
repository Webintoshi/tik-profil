import type { CustomerAccount } from "../api/customer";

const createdAt = "2026-07-11T08:00:00.000Z";

export function createTask8BrowserCustomer(): CustomerAccount {
  return {
    addresses: [
      { city: "Ordu", createdAt, district: "Altınordu", fullAddress: "Sahil Mahallesi 52", id: "task8-address-home", isDefault: true, label: "Ev", latitude: null, longitude: null, updatedAt: createdAt },
      { city: "Ordu", createdAt, district: "Altınordu", fullAddress: "İsmet Paşa Caddesi 8", id: "task8-address-work", isDefault: false, label: "İş", latitude: null, longitude: null, updatedAt: createdAt }
    ],
    appointments: [],
    email: "task8@example.test",
    orders: [
      { businessId: "task8-business-1", businessName: "Ordu Kahve Atölyesi", createdAt, id: "task8-order-1", itemCount: 2, orderNumber: "T8-001", recordType: "fastfood", status: "Hazırlanıyor", total: 286 },
      { businessId: "task8-business-2", businessName: "Sahil Tasarım", createdAt, id: "task8-order-2", itemCount: 1, orderNumber: "T8-002", recordType: "ecommerce", status: "Teslim edildi", total: 640 }
    ],
    profile: {
      appUserId: "task8-user",
      avatarUrl: null,
      birthDate: "1992-05-20",
      createdAt,
      displayName: "Ada Yılmaz",
      hobbies: ["Kahve", "Yürüyüş"],
      maritalStatus: "Bekar",
      occupation: "Tasarımcı",
      phone: "05550000000",
      preferences: {},
      updatedAt: createdAt
    },
    reservations: [
      { businessId: "task8-hotel", createdAt, endDate: "2026-08-03T10:00:00.000Z", id: "task8-reservation-1", reservationType: "hotel", startDate: "2026-08-01T14:00:00.000Z", status: "Onaylandı", total: 3200 }
    ]
  };
}
