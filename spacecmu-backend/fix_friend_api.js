import fs from 'fs';
const file = './src/controllers/friendController.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/avatarUrl: usersTable\.avatarUrl,/g, 'avatarUrl: usersTable.avatarUrl,\n                role: usersTable.role,');

fs.writeFileSync(file, content);
console.log('done');
