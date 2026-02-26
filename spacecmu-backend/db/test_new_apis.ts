

// Set up
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE3M2JiOTUzLWRiNjYtNGMxMy04MjczLWUyOWMzMzVkZmQ2YiIsInJvbGUiOiJhZG1pbiIsInVzZXJuYW1lIjoiNjUwNjEyMTAyIiwiZW1haWwiOiJzaXJhcGhvYl9sdUBjbXUuYWMudGgiLCJpdGFjY291bnRfbmFtZSI6InNpcmFwaG9iX2x1IiwicHJlbmFtZV9USCI6IiIsImZpcnN0bmFtZV9USCI6IuC4quC4tOC4o-C4oOC4niIsImxhc3RuYW1lX1RIIjoi4LmA4Lir4Lil4Li34Lit4LiH4Lib4Lij4Liw4LmA4Liq4Lij4Li04LiQIiwib3JnYW5pemF0aW9uX25hbWVfVEgiOiLguITguJPguLDguKfguLTguKjguKfguIHguKPguKPguKHguKjguLLguKrguJXguKPguYwiLCJpYXQiOjE3NzIwOTYzMzMsImV4cCI6MTc3MjE4MjczM30.fbYjntFEOanyh7CU2eI9a57GsxwsuqYTrzkP5JK9ZEQ";
const BASE_URL = "http://localhost:3001/api";

const headers = {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
};

async function testAll() {
    console.log("=== Testing Backend APIs ===\n");

    // 1. Auth Me
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers });
    const meData = (await meRes.json()) as any;
    console.log(`1. Get Me: ${meRes.status}`, meData.user?.username ? `Success (User: ${meData.user.username})` : meData);
    const myId = meData.user?.id;

    if (!myId) {
        console.error("Token is invalid or user not found. Stop.");
        return;
    }

    // Get another user to interact with
    const usersRes = await fetch(`${BASE_URL}/users`, { headers });
    const usersData = (await usersRes.json()) as any[];
    const otherUser = usersData.find((u: any) => u.id !== myId);
    if (!otherUser) {
        console.log("No other user found! Test might be incomplete.");
        return;
    }
    const otherId = otherUser.id;
    console.log(`\nFound other user to interact with: ${otherUser.username} (${otherId})\n`);


    // ==========================================
    // 1. Follow System & Feed Separation
    // ==========================================
    console.log("--- 1. Testing Follow System & Feed Separation ---");
    let followRes = await fetch(`${BASE_URL}/follows`, {
        method: "POST", headers,
        body: JSON.stringify({ followingId: otherId })
    });
    console.log("POST /api/follows ->", followRes.status);

    let followStatusRes = await fetch(`${BASE_URL}/follows/status/${otherId}`, { headers });
    console.log(`GET /api/follows/status/${otherId} ->`, followStatusRes.status, await followStatusRes.json());

    let followFeedRes = await fetch(`${BASE_URL}/posts?category=Follow`, { headers });
    const ffData = (await followFeedRes.json()) as any;
    console.log("GET /api/posts?category=Follow ->", followFeedRes.status, `Posts retrieved: ${ffData.posts ? ffData.posts.length : 0}`);

    let unfollowRes = await fetch(`${BASE_URL}/follows/${otherId}`, { method: "DELETE", headers });
    console.log("DELETE /api/follows ->", unfollowRes.status);
    console.log("");


    // ==========================================
    // 2. Market Item Update Status
    // ==========================================
    console.log("--- 2. Testing Market Item Status Update ---");
    // Create first
    let createItemRes = await fetch(`${BASE_URL}/market/items`, {
        method: "POST", headers,
        body: JSON.stringify({
            title: "Test Item from API Tester",
            description: "To be sold",
            price: 1500,
            category: "Others",
            contactInfo: "test seller"
        })
    });
    const itemData = (await createItemRes.json()) as any;
    let itemId = itemData.id;
    console.log("POST /api/market/items ->", createItemRes.status, itemId ? `Created item ${itemId}` : "Failed");

    if (itemId) {
        let updateStatusRes = await fetch(`${BASE_URL}/market/items/${itemId}/status`, {
            method: "PATCH", headers,
            body: JSON.stringify({ status: "sold" })
        });
        const updateData = (await updateStatusRes.json()) as any;
        console.log(`PATCH /api/market/items/${itemId}/status ->`, updateStatusRes.status, updateData.message || updateData);
    }
    console.log("");


    // ==========================================
    // 3. Official Account Banner (.webp test)
    // ==========================================
    console.log("--- 3. Testing User Banner (+ .webp test) ---");
    const formData = new FormData();
    const blob = new Blob(["fake webp bytes..."], { type: "image/webp" });
    formData.append("banner", blob, "test_banner.webp");

    let uploadBannerRes = await fetch(`${BASE_URL}/users/profile/banner`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${TOKEN}` }, // No content-type so browser/fetch fills it with boundary
        body: formData as any
    });
    let upData = (await uploadBannerRes.json()) as any;
    console.log("PATCH /api/users/profile/banner ->", uploadBannerRes.status, upData.message || upData);

    let deleteBannerRes = await fetch(`${BASE_URL}/users/profile/banner`, { method: "DELETE", headers });
    let delData = (await deleteBannerRes.json()) as any;
    console.log("DELETE /api/users/profile/banner ->", deleteBannerRes.status, delData.message || delData);
    console.log("");


    // ==========================================
    // 4. Market Card in Chat & Room Leave Logic
    // ==========================================
    console.log("--- 4. Testing Market Card in Chat & Room Leave ---");
    let sendMsgRes = await fetch(`${BASE_URL}/messages`, {
        method: "POST", headers,
        body: JSON.stringify({
            receiverId: otherId, // This creates/gets 1-on-1 room
            content: "Check this out!",
            messageType: "market_card",
            marketItemId: itemId
        })
    });
    const msgData = (await sendMsgRes.json()) as any;
    console.log("POST /api/messages (Market Card) ->", sendMsgRes.status, "Market Item ID inserted:", msgData.marketItemId || "null");

    // Check Leave room 1-on-1 logic if possible?
    if (sendMsgRes.status === 201 && msgData.roomId) {
        // According to our fix, leaving a 1-on-1 room won't delete it
        let leaveRes = await fetch(`${BASE_URL}/chat-rooms/${msgData.roomId}/leave`, { method: "POST", headers });
        let leaveData = (await leaveRes.json()) as any;
        console.log(`POST /api/chat-rooms/${msgData.roomId}/leave (1-on-1) ->`, leaveRes.status, leaveData.message || leaveData);
    }
    console.log("");


    // ==========================================
    // 5. Accept Friend By User ID Fix
    // ==========================================
    console.log("--- 5. Testing Friend Request By User ID ---");
    // Can't easily simulate receiving a request, but we can verify the API's presence and validation
    let acceptRes = await fetch(`${BASE_URL}/friends/respond-by-user`, {
        method: "POST", headers,
        body: JSON.stringify({ userId: otherId, status: "accepted" })
    });
    const accData = (await acceptRes.json()) as any;
    console.log("POST /api/friends/respond-by-user ->", acceptRes.status, accData.message || accData);

    console.log("\n--- Testing Complete ---");
}

testAll().catch(e => console.error("Test failed:", e));
