import fs from 'fs';
const file = './src/controllers/postController.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/authorAvatarUrl: usersTable\.avatarUrl,/g, 'authorAvatarUrl: usersTable.avatarUrl,\n                authorRole: usersTable.role,');

content = content.replace(/const \{ authorFirstName, authorLastName, authorAvatarUrl, \.\.\.postData \} = post;/g, 'const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;');

content = content.replace(/author: \{\s*firstName: (post\.)?authorFirstName,\s*lastName: (post\.)?authorLastName,\s*avatarUrl: (post\.)?authorAvatarUrl,\s*\}/g, (match, p1, p2, p3) => {
    let prefix = p1 || '';
    return `author: {\n                firstName: ${prefix}authorFirstName,\n                lastName: ${prefix}authorLastName,\n                avatarUrl: ${prefix}authorAvatarUrl,\n                role: ${prefix}authorRole,\n            }`;
});

fs.writeFileSync(file, content);
console.log('done');
