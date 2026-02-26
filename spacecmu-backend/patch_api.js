import fs from 'fs';
const file = './api.json';
let data = JSON.parse(fs.readFileSync(file, 'utf-8'));

// Find Categories
const usersCategory = data.item.find(i => i.name === '01. Users');
const postsCategory = data.item.find(i => i.name === '02. Posts');
const marketCategory = data.item.find(i => i.name === '03. Market');
const friendsCategory = data.item.find(i => i.name === '04. Friends & Social');
const messagesCategory = data.item.find(i => i.name === '06. Messages & Chat');

// 3. Follow
const followCategory = {
    "name": "Follows",
    "item": [
        {
            "name": "Follow User",
            "request": {
                "method": "POST",
                "header": [{"key": "Authorization", "value": "Bearer {{token}}", "type": "text"}],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"followingId\": \"user_uuid_here\"\n}",
                    "options": { "raw": { "language": "json" } }
                },
                "url": {
                    "raw": "{{baseUrl}}/api/follows",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "follows"]
                }
            }
        },
        {
            "name": "Unfollow User",
            "request": {
                "method": "DELETE",
                "header": [{"key": "Authorization", "value": "Bearer {{token}}", "type": "text"}],
                "url": {
                    "raw": "{{baseUrl}}/api/follows/:followingId",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "follows", ":followingId"],
                    "variable": [{"key": "followingId", "value": "user_uuid_here"}]
                }
            }
        },
        {
            "name": "Get Follow Status",
            "request": {
                "method": "GET",
                "header": [{"key": "Authorization", "value": "Bearer {{token}}", "type": "text"}],
                "url": {
                    "raw": "{{baseUrl}}/api/follows/status/:followingId",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "follows", "status", ":followingId"],
                    "variable": [{"key": "followingId", "value": "user_uuid_here"}]
                }
            }
        }
    ]
};
data.item.splice(4, 0, followCategory); // Insert after friends

// 4. Market Status
if (marketCategory) {
    marketCategory.item.push({
        "name": "Update Market Item Status",
        "request": {
            "method": "PATCH",
            "header": [
                {"key": "Authorization", "value": "Bearer {{token}}", "type": "text"},
                {"key": "Content-Type", "value": "application/json", "type": "text"}
            ],
            "body": {
                "mode": "raw",
                "raw": "{\n  \"status\": \"sold\"\n}",
                "options": { "raw": { "language": "json" } }
            },
            "url": {
                "raw": "{{baseUrl}}/api/market/items/:itemId/status",
                "host": ["{{baseUrl}}"],
                "path": ["api", "market", "items", ":itemId", "status"],
                "variable": [{"key": "itemId", "value": "item_uuid_here"}]
            }
        }
    });
}

// 5. Official Account Banner
if (usersCategory) {
    const profileSection = usersCategory.item.find(i => i.name === 'Profile');
    if (profileSection) {
        profileSection.item.push({
            "name": "Update Banner",
            "request": {
                "method": "PATCH",
                "header": [{"key": "Authorization", "value": "Bearer {{token}}", "type": "text"}],
                "body": {
                    "mode": "formdata",
                    "formdata": [{"key": "banner", "type": "file", "src": []}]
                },
                "url": {
                    "raw": "{{baseUrl}}/api/users/profile/banner",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "users", "profile", "banner"]
                }
            }
        });
        profileSection.item.push({
            "name": "Delete Banner",
            "request": {
                "method": "DELETE",
                "header": [{"key": "Authorization", "value": "Bearer {{token}}", "type": "text"}],
                "url": {
                    "raw": "{{baseUrl}}/api/users/profile/banner",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "users", "profile", "banner"]
                }
            }
        });
    }
}

// 9. Accept Friend via User ID
if (friendsCategory) {
    const friendRequests = friendsCategory.item.find(i => i.name === 'Friend Requests');
    if (friendRequests) {
        friendRequests.item.push({
            "name": "Respond to Request (By User ID)",
            "request": {
                "method": "POST",
                "header": [
                    {"key": "Authorization", "value": "Bearer {{token}}", "type": "text"},
                    {"key": "Content-Type", "value": "application/json", "type": "text"}
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"userId\": \"user_uuid_here\",\n  \"status\": \"accepted\"\n}",
                    "options": { "raw": { "language": "json" } }
                },
                "url": {
                    "raw": "{{baseUrl}}/api/friends/respond-by-user",
                    "host": ["{{baseUrl}}"],
                    "path": ["api", "friends", "respond-by-user"]
                }
            }
        });
    }
}

// 10. Send Market Card
if (messagesCategory) {
    // Add market card sending to the sendMessage description
    const sendMsg = messagesCategory.item.find(i => i.name === 'Send Message (Room)');
    if (sendMsg) {
        sendMsg.request.description = (sendMsg.request.description || '') + "\n\n**Market Card:** Include `marketItemId` and `messageType: \"market_card\"`.";
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('patched');
