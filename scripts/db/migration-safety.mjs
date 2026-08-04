function stripSqlComments(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/--.*$/gm, " ");
}

function removeAllowedConstraintReplacement(sql, filename) {
    const allowedValues = new Map([
        ["0016_business_import_sector_expansion.sql", "'petshop'\\s*,\\s*'veteriner'\\s*,\\s*'fastfood'"],
        ["0017_business_import_auto_dealer_sector.sql", "'petshop'\\s*,\\s*'veteriner'\\s*,\\s*'fastfood'\\s*,\\s*'oto_galeri'"],
        ["0018_business_import_restaurant_sector.sql", "'petshop'\\s*,\\s*'veteriner'\\s*,\\s*'fastfood'\\s*,\\s*'oto_galeri'\\s*,\\s*'restaurant'"],
        ["0019_business_import_cafe_sector.sql", "'petshop'\\s*,\\s*'veteriner'\\s*,\\s*'fastfood'\\s*,\\s*'oto_galeri'\\s*,\\s*'restaurant'\\s*,\\s*'cafe'"],
        ["0020_business_import_remaining_sectors.sql", "'petshop'\\s*,\\s*'veteriner'\\s*,\\s*'fastfood'\\s*,\\s*'oto_galeri'\\s*,\\s*'restaurant'\\s*,\\s*'cafe'\\s*,\\s*'beauty'\\s*,\\s*'real_estate'\\s*,\\s*'lodging'\\s*,\\s*'car_rental'\\s*,\\s*'healthcare'\\s*,\\s*'grocery'\\s*,\\s*'bakery'\\s*,\\s*'auto_service'"],
    ]).get(filename);
    if (!allowedValues) return sql;
    const restored = new RegExp(
        `alter\\s+table\\s+business_import_candidates\\s+add\\s+constraint\\s+business_import_candidates_sector_key_check\\s+check\\s*\\(\\s*sector_key\\s+in\\s*\\(\\s*${allowedValues}\\s*\\)\\s*\\)`,
        "i",
    ).test(sql);
    if (!restored) return sql;
    return sql.replace(
        /alter\s+table\s+business_import_candidates\s+drop\s+constraint\s+if\s+exists\s+business_import_candidates_sector_key_check\s*;/gi,
        " ",
    );
}

export function assertNonDestructive(sql, filename) {
    const normalized = removeAllowedConstraintReplacement(
        stripSqlComments(sql).toLowerCase(),
        filename,
    );
    const destructivePatterns = [
        /\bdrop\s+(table|schema|database|extension|index|view|materialized\s+view|type)\b/,
        /\btruncate\s+(table\s+)?\b/,
        /\balter\s+table\b[\s\S]*?\bdrop\s+(column|constraint)\b/,
    ];

    for (const pattern of destructivePatterns) {
        if (pattern.test(normalized)) {
            throw new Error(`Refusing to apply destructive SQL in ${filename}.`);
        }
    }
}
