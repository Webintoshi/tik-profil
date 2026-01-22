#!/usr/bin/env node
// Quick Node script to fix remaining DEMO imports
const fs = require('fs');
const path = require('path');

const files = [
    {
        path: 'src/app/dashboard/security/page.tsx',
        changes: [
            { find: 'DEMO_ADMINS,\n', replace: '' },
            { find: 'useState<Admin[]>(DEMO_ADMINS)', replace: 'useState<Admin[]>([])' },
            { find: 'setAdmins(data.length > 0 ? data : DEMO_ADMINS);', replace: 'setAdmins(data);' }
        ]
    },
    {
        path: 'src/app/dashboard/store/page.tsx',
        changes: [
            { find: 'DEMO_PRODUCTS,\n', replace: '' },
            { find: 'useState<StoreProduct[]>(DEMO_PRODUCTS)', replace: 'useState<StoreProduct[]>([])' },
            { find: 'setProducts(data.length > 0 ? data : DEMO_PRODUCTS);', replace: 'setProducts(data);' }
        ]
    }
];

console.log('Fixing remaining DEMO references...');
let fixed = 0;

files.forEach(file => {
    const filePath = path.join(process.cwd(), file.path);
    let content = fs.readFileSync(filePath, 'utf8');

    file.changes.forEach(change => {
        if (content.includes(change.find)) {
            content = content.replace(change.find, change.replace);
            fixed++;
        }
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${file.path}`);
});

console.log(`\nTotal fixes applied: ${fixed}`);
