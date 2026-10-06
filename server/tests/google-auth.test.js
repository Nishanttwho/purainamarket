import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {
    googleLoginController,
    loginUserController,
    logoutController
} from "../controllers/user.controller.js";
import { hashPassword } from "../helper/passwordHashng.js";
import UserModel from "../models/user.model.js";
import googleAuthClient from "../config/googleAuth.js";
import authMiddleware from "../middleware/authMiddleware.js";

process.env.GOOGLE_CLIENT_ID = "puraina-test-client-id";
process.env.SECRET_KEY_ACCESS_TOKEN = "test-access-token-secret";
process.env.SECRET_KEY_REFRESH_TOKEN = "test-refresh-token-secret";

const userId = new mongoose.Types.ObjectId();
const validCredential = "verified-google-id-token";

const googlePayload = (overrides = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return {
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        sub: "google-sub-123456",
        email: "Google.User@example.com",
        email_verified: true,
        name: "Google User",
        picture: "https://example.com/avatar.png",
        iat: now - 10,
        exp: now + 3600,
        ...overrides
    };
};

const mockVerifiedPayload = (payload = googlePayload()) => {
    googleAuthClient.verifyIdToken = async ({ idToken, audience }) => {
        assert.equal(idToken, validCredential);
        assert.equal(audience, process.env.GOOGLE_CLIENT_ID);
        return { getPayload: () => payload };
    };
};

const responseMock = () => ({
    statusCode: 200,
    cookies: [],
    clearedCookies: [],
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
    clearCookie(name, options) { this.clearedCookies.push({ name, options }); return this; }
});

const configureUserModel = ({ googleUser = null, emailUser = null } = {}) => {
    let savedUser = null;
    const updates = [];
    const queries = [];
    UserModel.findOne = async (query) => {
        queries.push(query);
        return query.googleId ? googleUser : emailUser;
    };
    UserModel.prototype.save = async function save() {
        savedUser = this;
        return this;
    };
    UserModel.findByIdAndUpdate = async (...args) => {
        updates.push(args);
        return args[0] ? ({ _id: args[0], role: "USER", status: "Active" }) : ({});
    };
    UserModel.updateOne = async () => ({});
    return { getSavedUser: () => savedUser, queries, updates };
};

const requestForGoogleLogin = (body = {}) => ({ body: { credential: validCredential, ...body } });

test("rejects a Google credential that Google's verifier rejects", async () => {
    googleAuthClient.verifyIdToken = async () => { throw new Error("invalid token"); };
    const users = configureUserModel();
    const response = responseMock();

    await googleLoginController(requestForGoogleLogin(), response);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.cookies.length, 0);
    assert.equal(users.getSavedUser(), null);
});

test("rejects untrusted Google audience, issuer, expiration, and email claims", async () => {
    const invalidClaims = [
        { aud: "another-client-id" },
        { iss: "https://attacker.example" },
        { exp: Math.floor(Date.now() / 1000) - 1 },
        { email_verified: false }
    ];

    for (const claims of invalidClaims) {
        mockVerifiedPayload(googlePayload(claims));
        configureUserModel();
        const response = responseMock();
        await googleLoginController(requestForGoogleLogin(), response);
        assert.equal(response.statusCode, 401);
        assert.equal(response.cookies.length, 0);
    }
});

test("creates a verified Google customer with USER role and app JWTs", async () => {
    mockVerifiedPayload();
    const users = configureUserModel();
    const response = responseMock();

    await googleLoginController(requestForGoogleLogin({ email: "attacker@example.com", role: "ADMIN", name: "Untrusted" }), response);

    const createdUser = users.getSavedUser();
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(createdUser.googleId, "google-sub-123456");
    assert.equal(createdUser.email, "google.user@example.com");
    assert.equal(createdUser.name, "Google User");
    assert.equal(createdUser.mobile, null);
    assert.equal(createdUser.verify_email, true);
    assert.equal(createdUser.role, "USER");
    assert.notEqual(createdUser.password, validCredential);
    assert.equal(createdUser.validateSync(), undefined);
    assert.equal(response.body.data.role, "USER");
    assert.equal(response.cookies.map(({ name }) => name).join(","), "accessToken,refreshToken");
    assert.equal(response.cookies.every(({ options }) => options.httpOnly), true);

    const claims = jwt.verify(response.body.data.accessToken, process.env.SECRET_KEY_ACCESS_TOKEN);
    assert.equal(claims.id, createdUser._id.toString());
    assert.equal(response.body.data.refreshToken, response.cookies[1].value);

    const protectedRequest = { cookies: {}, header: { authorization: `Bearer ${response.body.data.accessToken}` } };
    let authenticated = false;
    await authMiddleware(protectedRequest, responseMock(), () => { authenticated = true; });
    assert.equal(authenticated, true);
    assert.equal(protectedRequest.userId, createdUser._id.toString());

    const logoutResponse = responseMock();
    await logoutController({ userId: protectedRequest.userId }, logoutResponse);
    assert.equal(logoutResponse.body.success, true);
    assert.equal(logoutResponse.clearedCookies.map(({ name }) => name).join(","), "accessToken,refreshToken");
});

test("does not allow Google profile input to assign ADMIN or RIDER roles", async () => {
    for (const requestedRole of ["ADMIN", "RIDER"]) {
        mockVerifiedPayload();
        const users = configureUserModel();
        const response = responseMock();
        await googleLoginController(requestForGoogleLogin({ role: requestedRole }), response);
        assert.equal(response.statusCode, 200);
        assert.equal(users.getSavedUser().role, "USER");
    }
});

test("logs into an existing Google account by stable subject without creating a duplicate", async () => {
    mockVerifiedPayload();
    const existingUser = { _id: userId, role: "USER", status: "Active" };
    const users = configureUserModel({ googleUser: existingUser });
    const response = responseMock();

    await googleLoginController(requestForGoogleLogin(), response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data.role, "USER");
    assert.equal(response.cookies.length, 2);
    assert.equal(users.getSavedUser(), null);
    assert.equal(users.queries.length, 1);
    assert.deepEqual(users.queries[0], { googleId: "google-sub-123456" });
});

test("preserves existing ADMIN and RIDER roles for already-linked Google identities", async () => {
    for (const role of ["ADMIN", "RIDER"]) {
        mockVerifiedPayload();
        configureUserModel({ googleUser: { _id: userId, role, status: "Active" } });
        const response = responseMock();
        await googleLoginController(requestForGoogleLogin(), response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.data.role, role);
    }
});

test("links a verified Google identity to an existing email account without creating a duplicate", async () => {
    mockVerifiedPayload();
    const emailUser = { _id: userId, role: "USER", status: "Active", googleId: undefined, verify_email: false };
    const users = configureUserModel({ emailUser });
    const response = responseMock();

    await googleLoginController(requestForGoogleLogin(), response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.cookies.length, 2);
    assert.equal(users.getSavedUser()?._id.toString(), emailUser._id.toString());
    assert.deepEqual(users.queries[0], { googleId: "google-sub-123456" });
    assert.equal(users.queries[1].email.$options, "i");
    assert.equal(users.updates.length, 1);
    assert.deepEqual(users.updates[0][1], { $set: { googleId: "google-sub-123456", verify_email: true } });
});

test("does not link a Google identity already owned by another account", async () => {
    mockVerifiedPayload();
    const emailUser = { _id: userId, role: "USER", status: "Active" };
    const users = configureUserModel({ emailUser });
    UserModel.findByIdAndUpdate = async () => { const error = new Error("duplicate key"); error.code = 11000; throw error; };
    const response = responseMock();

    await googleLoginController(requestForGoogleLogin(), response);

    assert.equal(response.statusCode, 409);
    assert.equal(response.cookies.length, 0);
    assert.equal(users.getSavedUser(), null);
});

test("existing email/password login continues issuing the normal application tokens", async () => {
    const password = await hashPassword("correct-password");
    const existingUser = { _id: userId, email: "local@example.com", password, role: "USER", status: "Active" };
    UserModel.findOne = async () => existingUser;
    UserModel.findByIdAndUpdate = async () => ({});
    UserModel.updateOne = async () => ({});
    const response = responseMock();

    await loginUserController({ body: { identifier: existingUser.email, password: "correct-password" } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.role, "USER");
    assert.equal(response.cookies.length, 2);
    assert.equal(jwt.verify(response.body.data.accessToken, process.env.SECRET_KEY_ACCESS_TOKEN).id, userId.toString());
});
