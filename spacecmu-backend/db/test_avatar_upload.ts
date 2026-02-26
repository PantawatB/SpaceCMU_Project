import fetch from "node-fetch";
import * as FormData from "form-data";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3001";

/**
 * Test uploading avatar
 * 
 * This test requires:
 * 1. A valid session cookie (user must be logged in)
 * 2. An image file to upload
 * 
 * API Endpoint: POST /api/settings/avatar
 * Expected request: multipart/form-data with field name "avatar"
 * Expected response: { message: "Avatar uploaded successfully", avatarUrl: "/uploads/avatar-xxxxx.jpg" }
 */
async function testUploadAvatar() {
    console.log("\n🧪 Testing Avatar Upload API...\n");

    // You need to replace this with a valid session cookie
    // To get a session cookie:
    // 1. Login via browser
    // 2. Open DevTools > Application > Cookies
    // 3. Copy the connect.sid cookie value
    const SESSION_COOKIE = "YOUR_SESSION_COOKIE_HERE";

    // Check if test image exists
    const testImagePath = path.join(process.cwd(), "uploads/images-1770882094895-335899154.avif");

    if (!fs.existsSync(testImagePath)) {
        console.error("❌ Test image not found at:", testImagePath);
        console.log("Please provide a valid image file for testing");
        return;
    }

    try {
        // Create form data
        const formData = new FormData();
        formData.append("avatar", fs.createReadStream(testImagePath));

        // Make request
        const response = await fetch(`${BASE_URL}/api/settings/avatar`, {
            method: "POST",
            body: formData,
            headers: {
                ...formData.getHeaders(),
                Cookie: `connect.sid=${SESSION_COOKIE}`,
            },
        });

        const data = (await response.json()) as any;

        console.log("📊 Response Status:", response.status);
        console.log("📊 Response Data:", JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log("\n✅ Test PASSED: Avatar uploaded successfully!");
            console.log("📸 New avatar URL:", data.avatarUrl);
        } else {
            console.log("\n❌ Test FAILED");
            if (response.status === 401) {
                console.log("⚠️  Unauthorized - Please provide a valid session cookie");
                console.log("   To get session cookie:");
                console.log("   1. Login via browser");
                console.log("   2. Open DevTools > Application > Cookies");
                console.log("   3. Copy the connect.sid value");
            } else if (response.status === 400) {
                console.log("⚠️  Bad Request - Check if file field name is 'avatar'");
            }
        }
    } catch (error) {
        console.error("\n❌ Test ERROR:", error);
    }
}

/**
 * Test without authentication (should fail)
 */
async function testUploadAvatarNoAuth() {
    console.log("\n🧪 Testing Avatar Upload without Auth (should fail)...\n");

    const testImagePath = path.join(process.cwd(), "uploads/images-1770882094895-335899154.avif");

    if (!fs.existsSync(testImagePath)) {
        console.error("❌ Test image not found");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("avatar", fs.createReadStream(testImagePath));

        const response = await fetch(`${BASE_URL}/api/settings/avatar`, {
            method: "POST",
            body: formData,
            headers: formData.getHeaders(),
        });

        const data = (await response.json()) as any;

        console.log("📊 Response Status:", response.status);
        console.log("📊 Response Data:", JSON.stringify(data, null, 2));

        if (response.status === 401) {
            console.log("\n✅ Test PASSED: Correctly rejected unauthorized request");
        } else {
            console.log("\n❌ Test FAILED: Should return 401 for unauthorized request");
        }
    } catch (error) {
        console.error("\n❌ Test ERROR:", error);
    }
}

/**
 * Test with wrong field name (should fail)
 */
async function testUploadAvatarWrongField() {
    console.log("\n🧪 Testing Avatar Upload with wrong field name (should fail)...\n");

    const SESSION_COOKIE = "YOUR_SESSION_COOKIE_HERE";
    const testImagePath = path.join(process.cwd(), "uploads/images-1770882094895-335899154.avif");

    if (!fs.existsSync(testImagePath)) {
        console.error("❌ Test image not found");
        return;
    }

    try {
        const formData = new FormData();
        // Wrong field name (should be "avatar")
        formData.append("image", fs.createReadStream(testImagePath));

        const response = await fetch(`${BASE_URL}/api/settings/avatar`, {
            method: "POST",
            body: formData,
            headers: {
                ...formData.getHeaders(),
                Cookie: `connect.sid=${SESSION_COOKIE}`,
            },
        });

        const data = (await response.json()) as any;

        console.log("📊 Response Status:", response.status);
        console.log("📊 Response Data:", JSON.stringify(data, null, 2));

        if (response.status === 400 && data.message === "No file uploaded") {
            console.log("\n✅ Test PASSED: Correctly rejected wrong field name");
        } else {
            console.log("\n❌ Test FAILED: Should return 400 for wrong field name");
        }
    } catch (error) {
        console.error("\n❌ Test ERROR:", error);
    }
}

async function runAll() {
    // Run tests
    console.log("=".repeat(60));
    console.log("🚀 Avatar Upload API Tests");
    console.log("=".repeat(60));

    // Test 1: No auth (should always work)
    await testUploadAvatarNoAuth();

    console.log("\n" + "=".repeat(60));
    console.log("\n⚠️  For the following tests, you need to:");
    console.log("1. Start the backend server: cd spacecmu-backend && npm run dev");
    console.log("2. Login via browser and get session cookie");
    console.log("3. Update SESSION_COOKIE in this file\n");

    // Test 2: With auth (requires session cookie)
    // await testUploadAvatar();

    // Test 3: Wrong field name
    // await testUploadAvatarWrongField();

    console.log("=".repeat(60));
    console.log("✨ Tests completed!");
    console.log("=".repeat(60));
}

runAll().catch(e => console.error(e));
