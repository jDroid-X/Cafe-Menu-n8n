const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

console.log('=== n8n Workflow Recovery Tool ===\n');

// Check main n8n database
const mainDbPath = 'C:/Users/jiten/.n8n/database.sqlite';
const demoDbPath = '.n8n_demo_runtime/.n8n/database.sqlite';

console.log('1. Checking main n8n database...');
if (fs.existsSync(mainDbPath)) {
    const db = new DatabaseSync(mainDbPath, { readOnly: true });
    try {
        const rows = db.prepare("SELECT id, name, active, createdAt FROM workflow_entity ORDER BY createdAt DESC").all();
        console.log(`   Found ${rows.length} workflows in main n8n:`);
        rows.forEach(r => {
            console.log(`   - ${r.id}: "${r.name}" (active: ${r.active}, created: ${r.createdAt})`);
        });
        
        // Check for backup table
        try {
            const backupRows = db.prepare("SELECT COUNT(*) as count FROM workflow_entity_backup").get();
            console.log(`   Backup table has ${backupRows.count} entries`);
        } catch(e) {
            console.log('   No backup table found');
        }
    } catch(e) {
        console.log('   Error:', e.message);
    }
    db.close();
} else {
    console.log('   Main DB not found at:', mainDbPath);
}

console.log('\n2. Checking demo n8n database...');
if (fs.existsSync(demoDbPath)) {
    const db = new DatabaseSync(demoDbPath, { readOnly: true });
    try {
        const rows = db.prepare("SELECT id, name, active, createdAt FROM workflow_entity ORDER BY createdAt DESC").all();
        console.log(`   Found ${rows.length} workflows in demo n8n:`);
        rows.forEach(r => {
            console.log(`   - ${r.id}: "${r.name}" (active: ${r.active}, created: ${r.createdAt})`);
        });
    } catch(e) {
        console.log('   Error:', e.message);
    }
    db.close();
} else {
    console.log('   Demo DB not found');
}

console.log('\n3. Checking for n8n backups...');
const backupPaths = [
    'C:/Users/jiten/.n8n/backups',
    'C:/Users/jiten/AppData/Roaming/n8n/backups',
    'C:/Users/jiten/.n8n/backup'
];
backupPaths.forEach(p => {
    if (fs.existsSync(p)) {
        const files = fs.readdirSync(p);
        console.log(`   ${p}: ${files.length} files`);
        files.slice(0, 5).forEach(f => console.log(`     - ${f}`));
    }
});

console.log('\n4. Checking n8n config...');
const configPath = 'C:/Users/jiten/.n8n/config';
if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('   Encryption key exists:', !!cfg.encryptionKey);
}

console.log('\nDone. Check above output.');
