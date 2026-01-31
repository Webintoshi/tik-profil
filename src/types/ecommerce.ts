import { z } from 'zod';

export const couponSchema = z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    minOrderAmount: z.number().positive().optional(),
});
