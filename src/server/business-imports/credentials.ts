import { createHash, randomInt } from "node:crypto";

import { createBusinessSlug } from "./normalization.ts";
import type { BusinessImportRepository } from "./repository.ts";

const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*+-=?";
const ALL_PASSWORD_CHARACTERS = `${LOWERCASE}${UPPERCASE}${DIGITS}${SYMBOLS}`;
const INITIAL_PASSWORD_LENGTH = 16;
const MAX_EMAIL_LOCAL_PART_LENGTH = 64;

export const LOGIN_ALIAS_DOMAIN = "tikprofil.com";

type AliasRepository = Pick<BusinessImportRepository, "reserveAlias">;

export interface AllocateLoginAliasInput {
    businessName: string;
    candidateId: string;
    district: string;
}

function randomCharacter(characters: string): string {
    return characters[randomInt(characters.length)] ?? characters[0] ?? "";
}

function shuffled(characters: string[]): string {
    for (let index = characters.length - 1; index > 0; index -= 1) {
        const replacementIndex = randomInt(index + 1);
        [characters[index], characters[replacementIndex]] = [characters[replacementIndex]!, characters[index]!];
    }
    return characters.join("");
}

export function generateInitialPassword(): string {
    const characters = [
        randomCharacter(LOWERCASE),
        randomCharacter(UPPERCASE),
        randomCharacter(DIGITS),
        randomCharacter(SYMBOLS),
    ];

    while (characters.length < INITIAL_PASSWORD_LENGTH) {
        characters.push(randomCharacter(ALL_PASSWORD_CHARACTERS));
    }

    return shuffled(characters);
}

function appendLocalPart(base: string, suffix: string): string {
    const boundedSuffix = suffix.slice(0, MAX_EMAIL_LOCAL_PART_LENGTH - 2).replace(/-+$/g, "") || "x";
    const availableBaseLength = MAX_EMAIL_LOCAL_PART_LENGTH - boundedSuffix.length - 1;
    const boundedBase = base.slice(0, availableBaseLength).replace(/-+$/g, "") || "i";
    return `${boundedBase}-${boundedSuffix}`;
}

function stableCandidateSuffix(candidateId: string): string {
    return createHash("sha256").update(candidateId.trim()).digest("hex").slice(0, 6);
}

export async function allocateLoginAlias(
    repository: AliasRepository,
    input: AllocateLoginAliasInput,
): Promise<string> {
    const base = createBusinessSlug(input.businessName).slice(0, MAX_EMAIL_LOCAL_PART_LENGTH);
    const district = createBusinessSlug(input.district);
    const candidates = [
        base,
        appendLocalPart(base, district),
        appendLocalPart(base, stableCandidateSuffix(input.candidateId)),
    ];

    for (const localPart of candidates) {
        const alias = `${localPart}@${LOGIN_ALIAS_DOMAIN}`;
        if (await repository.reserveAlias(input.candidateId, alias)) {
            return alias;
        }
    }

    throw new Error("login_alias_unavailable");
}
