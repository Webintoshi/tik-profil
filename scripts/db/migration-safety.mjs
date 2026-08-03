function stripSqlComments(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/--.*$/gm, " ");
}

function removeAllowedConstraintReplacement(sql, filename) {
    if (filename !== "0016_business_import_sector_expansion.sql") return sql;
    const restored = /alter\s+table\s+business_import_candidates\s+add\s+constraint\s+business_import_candidates_sector_key_check\s+check\s*\(\s*sector_key\s+in\s*\(\s*'petshop'\s*,\s*'veteriner'\s*,\s*'fastfood'\s*\)\s*\)/i.test(sql);
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
