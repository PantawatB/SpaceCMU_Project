import fs from 'fs';

const file = './api.json';
let data = JSON.parse(fs.readFileSync(file, 'utf-8'));

// Helper: find top-level categories
const findCategory = (name) => data.item.find(i => i.name === name);
const findSubCategory = (cat, name) => cat?.item?.find(i => i.name === name);

// Helper: create a standard request object
function makeRequest({ name, method, path, headers = true, body = null, description = '', query = null, variables = null }) {
    const req = { method, header: [] };

    if (headers) {
        req.header.push({ key: 'Authorization', value: 'Bearer {{token}}', type: 'text' });
    }
    if (body && body.mode === 'raw') {
        req.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    }

    if (body) req.body = body;

    const url = {
        raw: `{{baseUrl}}${path}${query ? '?' + query.map(q => `${q.key}=${q.value}`).join('&') : ''}`,
        host: ['{{baseUrl}}'],
        path: path.split('/').filter(Boolean),
    };
    if (query) url.query = query;
    if (variables) url.variable = variables;
    req.url = url;

    if (description) req.description = description;

    return { name, request: req, response: [] };
}

// ─────────────────────────────────────────────
// 01. Users — Add Batch Get Users
// ─────────────────────────────────────────────
const usersCategory = findCategory('01. Users');
const accountMgmt = findSubCategory(usersCategory, 'Account Management');
if (accountMgmt) {
    const exists = accountMgmt.item.find(i => i.name === 'Batch Get Users');
    if (!exists) {
        accountMgmt.item.push(makeRequest({
            name: 'Batch Get Users',
            method: 'GET',
            path: '/api/users/batch',
            query: [{ key: 'ids', value: 'uuid1,uuid2,uuid3' }],
            description: 'Get multiple users by their IDs in a single request. Pass comma-separated UUIDs as query parameter.',
        }));
        console.log('✅ Added: Batch Get Users');
    }
}

// ─────────────────────────────────────────────
// 02. Posts — Add missing endpoints
// ─────────────────────────────────────────────
const postsCategory = findCategory('02. Posts');
const feedSection = findSubCategory(postsCategory, 'Feed');
const commentsSection = findSubCategory(postsCategory, 'Comments');

// 2a. Get Post By ID
if (feedSection) {
    if (!feedSection.item.find(i => i.name === 'Get Post By ID')) {
        feedSection.item.push(makeRequest({
            name: 'Get Post By ID',
            method: 'GET',
            path: '/api/posts/:postId',
            variables: [{ key: 'postId', value: 'post_uuid_here' }],
            description: 'Get a single post by its ID. Returns full post data with author info, like/comment counts.',
        }));
        console.log('✅ Added: Get Post By ID');
    }
}

// 2b. Edit Post
if (feedSection) {
    if (!feedSection.item.find(i => i.name === 'Edit Post')) {
        feedSection.item.push(makeRequest({
            name: 'Edit Post',
            method: 'PATCH',
            path: '/api/posts/:postId',
            body: {
                mode: 'formdata',
                formdata: [
                    { key: 'content', value: 'Updated post content', type: 'text' },
                    { key: 'category', value: 'Global', type: 'text' },
                    { key: 'media', type: 'file', src: [], description: 'New media files (optional)' },
                ],
            },
            variables: [{ key: 'postId', value: 'post_uuid_here' }],
            description: 'Edit an existing post. Supports multipart/form-data for media updates (max 20 files).',
        }));
        console.log('✅ Added: Edit Post');
    }
}

// 2c. Get Event from Post
if (feedSection) {
    if (!feedSection.item.find(i => i.name === 'Get Event from Post')) {
        feedSection.item.push(makeRequest({
            name: 'Get Event from Post',
            method: 'GET',
            path: '/api/posts/:postId/event',
            variables: [{ key: 'postId', value: 'post_uuid_here' }],
            description: 'Get the event data attached to a post (eventTitle, eventStartTime, eventEndTime, eventType).',
        }));
        console.log('✅ Added: Get Event from Post');
    }
}

// 2d. Edit Comment
if (commentsSection) {
    if (!commentsSection.item.find(i => i.name === 'Edit Comment')) {
        commentsSection.item.push(makeRequest({
            name: 'Edit Comment',
            method: 'PATCH',
            path: '/api/posts/comment/:commentId',
            body: {
                mode: 'raw',
                raw: JSON.stringify({ content: 'Updated comment text' }, null, 2),
                options: { raw: { language: 'json' } },
            },
            variables: [{ key: 'commentId', value: 'comment_uuid_here' }],
            description: 'Edit an existing comment.',
        }));
        console.log('✅ Added: Edit Comment');
    }
}

// 2e. Like / Unlike Comment
if (commentsSection) {
    if (!commentsSection.item.find(i => i.name?.includes('Like') && i.name?.includes('Comment'))) {
        commentsSection.item.push(makeRequest({
            name: 'Like / Unlike Comment (Toggle)',
            method: 'POST',
            path: '/api/posts/comment/like',
            body: {
                mode: 'raw',
                raw: JSON.stringify({ commentId: 'comment_uuid_here' }, null, 2),
                options: { raw: { language: 'json' } },
            },
            description: 'Toggle like on a comment. If already liked, it will unlike.',
        }));
        console.log('✅ Added: Like / Unlike Comment');
    }
}

// 2f. Get Post by Comment ID
if (commentsSection) {
    if (!commentsSection.item.find(i => i.name === 'Get Post by Comment ID')) {
        commentsSection.item.push(makeRequest({
            name: 'Get Post by Comment ID',
            method: 'GET',
            path: '/api/posts/comment/:commentId/post',
            variables: [{ key: 'commentId', value: 'comment_uuid_here' }],
            description: 'Get the parent post of a comment. Useful for navigating from comment_like notifications.',
        }));
        console.log('✅ Added: Get Post by Comment ID');
    }
}

// ─────────────────────────────────────────────
// 03. Market — Add missing endpoints
// ─────────────────────────────────────────────
const marketCategory = findCategory('03. Market');
if (marketCategory) {
    // Get Market Item by ID
    if (!marketCategory.item.find(i => i.name === 'Get Market Item By ID')) {
        // Insert after "Get My Market Items"
        const insertIdx = marketCategory.item.findIndex(i => i.name === 'Get My Market Items');
        marketCategory.item.splice(insertIdx + 1, 0, makeRequest({
            name: 'Get Market Item By ID',
            method: 'GET',
            path: '/api/market/items/:itemId',
            variables: [{ key: 'itemId', value: 'item_uuid_here' }],
            description: 'Get a single market item by its ID.',
        }));
        console.log('✅ Added: Get Market Item By ID');
    }

    // Delete Market Item
    if (!marketCategory.item.find(i => i.name === 'Delete Market Item')) {
        marketCategory.item.push(makeRequest({
            name: 'Delete Market Item',
            method: 'DELETE',
            path: '/api/market/items/:itemId',
            variables: [{ key: 'itemId', value: 'item_uuid_here' }],
            description: 'Delete a market item. Only the original seller can delete their item.',
        }));
        console.log('✅ Added: Delete Market Item');
    }
}

// ─────────────────────────────────────────────
// 06. Messaging & Chat — Add missing endpoints
// ─────────────────────────────────────────────
const messagingCategory = findCategory('06. Messaging & Chat');
const messagesSection = findSubCategory(messagingCategory, 'Messages');

if (messagesSection) {
    // Send Message with Media
    if (!messagesSection.item.find(i => i.name?.includes('Media'))) {
        const sendIdx = messagesSection.item.findIndex(i => i.name === 'Send Message');
        messagesSection.item.splice(sendIdx + 1, 0, makeRequest({
            name: 'Send Message with Media',
            method: 'POST',
            path: '/api/messages/room/:roomId/media',
            body: {
                mode: 'formdata',
                formdata: [
                    { key: 'content', value: 'Check this out!', type: 'text' },
                    { key: 'media', type: 'file', src: [], description: 'Images/videos (max 15)' },
                ],
            },
            variables: [{ key: 'roomId', value: 'room_uuid_here' }],
            description: 'Send a message with media attachments. Max 15 files per message.',
        }));
        console.log('✅ Added: Send Message with Media');
    }

    // Get Room Readers
    if (!messagesSection.item.find(i => i.name?.includes('Readers'))) {
        messagesSection.item.push(makeRequest({
            name: 'Get Room Readers',
            method: 'GET',
            path: '/api/messages/room/:roomId/readers',
            variables: [{ key: 'roomId', value: 'room_uuid_here' }],
            description: 'Get the read receipt status for all members in a room.',
        }));
        console.log('✅ Added: Get Room Readers');
    }

    // Edit Message
    if (!messagesSection.item.find(i => i.name === 'Edit Message')) {
        messagesSection.item.push(makeRequest({
            name: 'Edit Message',
            method: 'PATCH',
            path: '/api/messages/:messageId',
            body: {
                mode: 'raw',
                raw: JSON.stringify({ content: 'Edited message content' }, null, 2),
                options: { raw: { language: 'json' } },
            },
            variables: [{ key: 'messageId', value: 'message_uuid_here' }],
            description: 'Edit a sent message. Only the sender can edit their own message.',
        }));
        console.log('✅ Added: Edit Message');
    }
}

// ─────────────────────────────────────────────
// 08. Notifications — Add missing endpoints
// ─────────────────────────────────────────────
const notifCategory = findCategory('08. Notifications & Announcements');
if (notifCategory) {
    // Mark All as Read
    if (!notifCategory.item.find(i => i.name?.includes('Mark All'))) {
        notifCategory.item.push(makeRequest({
            name: 'Mark All Notifications as Read',
            method: 'PATCH',
            path: '/api/notifications/:userId/read-all',
            variables: [{ key: 'userId', value: 'user_uuid_here' }],
            description: 'Mark all notifications for a user as read.',
        }));
        console.log('✅ Added: Mark All Notifications as Read');
    }

    // Delete Single Notification
    if (!notifCategory.item.find(i => i.name === 'Delete Notification')) {
        notifCategory.item.push(makeRequest({
            name: 'Delete Notification',
            method: 'DELETE',
            path: '/api/notifications/:notificationId',
            variables: [{ key: 'notificationId', value: 'notification_uuid_here' }],
            description: 'Delete a single notification by its ID.',
        }));
        console.log('✅ Added: Delete Notification');
    }

    // Delete All Notifications
    if (!notifCategory.item.find(i => i.name === 'Delete All Notifications')) {
        notifCategory.item.push(makeRequest({
            name: 'Delete All Notifications',
            method: 'DELETE',
            path: '/api/notifications/all',
            description: 'Delete all notifications for the authenticated user.',
        }));
        console.log('✅ Added: Delete All Notifications');
    }
}

// ─────────────────────────────────────────────
// 10. God — Add missing endpoints
// ─────────────────────────────────────────────
const godCategory = findCategory('10. God');
if (godCategory) {
    // Search All Users
    if (!godCategory.item.find(i => i.name?.includes('Search All Users'))) {
        godCategory.item.push(makeRequest({
            name: 'Search All Users (incl. Official)',
            method: 'GET',
            path: '/api/god/users/search-all',
            query: [{ key: 'query', value: 'john' }],
            description: 'Search all users including official_account role. Used for selecting private notification recipients.',
        }));
        console.log('✅ Added: Search All Users (incl. Official)');
    }

    // Notifications subfolder
    let godNotifSection = findSubCategory(godCategory, 'Notifications (God)');
    if (!godNotifSection) {
        godNotifSection = { name: 'Notifications (God)', item: [] };
        godCategory.item.push(godNotifSection);
        console.log('✅ Created: Notifications (God) section');
    }

    // Send Global Notification
    if (!godNotifSection.item.find(i => i.name?.includes('Global'))) {
        godNotifSection.item.push(makeRequest({
            name: 'Send Global Notification',
            method: 'POST',
            path: '/api/god/notifications/global',
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    title: 'System Update',
                    message: 'The system will undergo maintenance at 2AM.',
                }, null, 2),
                options: { raw: { language: 'json' } },
            },
            description: 'Broadcast a notification to all users on the platform.',
        }));
        console.log('✅ Added: Send Global Notification');
    }

    // Send Private Notifications
    if (!godNotifSection.item.find(i => i.name?.includes('Private'))) {
        godNotifSection.item.push(makeRequest({
            name: 'Send Private Notifications',
            method: 'POST',
            path: '/api/god/notifications/private',
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    recipientIds: ['user_uuid_1', 'user_uuid_2'],
                    title: 'Important Notice',
                    message: 'You have been selected for review.',
                }, null, 2),
                options: { raw: { language: 'json' } },
            },
            description: 'Send a notification to specific users by their IDs.',
        }));
        console.log('✅ Added: Send Private Notifications');
    }

    // Get Sent Notifications
    if (!godNotifSection.item.find(i => i.name?.includes('Sent'))) {
        godNotifSection.item.push(makeRequest({
            name: 'Get Sent Notifications',
            method: 'GET',
            path: '/api/god/notifications/sent',
            description: 'Get a list of all notifications sent by the god user (both global and private).',
        }));
        console.log('✅ Added: Get Sent Notifications');
    }

    // Reports subfolder
    let godReportsSection = findSubCategory(godCategory, 'Reports (God)');
    if (!godReportsSection) {
        godReportsSection = { name: 'Reports (God)', item: [] };
        godCategory.item.push(godReportsSection);
        console.log('✅ Created: Reports (God) section');
    }

    // Get Reports
    if (!godReportsSection.item.find(i => i.name === 'Get All Reports')) {
        godReportsSection.item.push(makeRequest({
            name: 'Get All Reports',
            method: 'GET',
            path: '/api/god/reports',
            description: 'Get all user-submitted reports. Supports filtering and pagination.',
        }));
        console.log('✅ Added: Get All Reports');
    }

    // Update Report Status
    if (!godReportsSection.item.find(i => i.name?.includes('Update Report'))) {
        godReportsSection.item.push(makeRequest({
            name: 'Update Report Status',
            method: 'PATCH',
            path: '/api/god/reports/:id/status',
            body: {
                mode: 'raw',
                raw: JSON.stringify({ status: 'resolved' }, null, 2),
                options: { raw: { language: 'json' } },
            },
            variables: [{ key: 'id', value: 'report_uuid_here' }],
            description: 'Update the status of a report (e.g. pending → reviewing → resolved → dismissed).',
        }));
        console.log('✅ Added: Update Report Status');
    }
}

// ─────────────────────────────────────────────
// 11. Reports (NEW section for user-facing report submission)
// ─────────────────────────────────────────────
if (!findCategory('11. Reports')) {
    data.item.push({
        name: '11. Reports',
        description: 'User-facing report submission for posts, users, and bugs',
        item: [
            {
                name: 'Submit Report',
                request: {
                    method: 'POST',
                    header: [
                        { key: 'Authorization', value: 'Bearer {{token}}', type: 'text' },
                    ],
                    body: {
                        mode: 'formdata',
                        formdata: [
                            { key: 'type', value: 'post', type: 'text', description: 'post | user | bug | other' },
                            { key: 'targetId', value: 'target_uuid_here', type: 'text', description: 'ID of the reported post/user (optional for bug)' },
                            { key: 'reason', value: 'Inappropriate content', type: 'text' },
                            { key: 'details', value: 'This post contains offensive language.', type: 'text' },
                            { key: 'media', type: 'file', src: [], description: 'Supporting evidence images/videos (max 10, 50MB each)' },
                        ],
                    },
                    url: {
                        raw: '{{baseUrl}}/api/reports',
                        host: ['{{baseUrl}}'],
                        path: ['api', 'reports'],
                    },
                    description: 'Submit a report about a post, user, or bug. Supports media attachments via multipart/form-data. Max 10 files, 50MB each. Accepted formats: jpg, png, gif, webp, mp4, mov, avi, mkv, webm, m4v.',
                },
                response: [],
            },
        ],
    });
    console.log('✅ Added: 11. Reports section with Submit Report');
}

// ─────────────────────────────────────────────
// Write the updated file
// ─────────────────────────────────────────────
fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('\n🎉 api.json has been updated successfully!');
