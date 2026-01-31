import { z } from 'zod';

export const serviceCategorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunlu').max(100),
    icon: z.string().max(50).optional(),
    order: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
});

export const formatPrice = (price: number): string => {
    return `${price.toLocaleString('tr-TR')} ₺`;
};

export const formatDuration = (duration: number): string => {
    if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
    }
    return `${duration} dk`;
};
