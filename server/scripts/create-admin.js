import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import { hashPassword } from "../helper/passwordHashng.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const terminalInput = process.stdin;
const terminalOutput = process.stdout;
const prompts = createInterface({ input: terminalInput, output: terminalOutput });

const ask = async (question) => (await prompts.question(question)).trim();

const askHidden = (question) => new Promise((resolve, reject) => {
    if (!terminalInput.isTTY || typeof terminalInput.setRawMode !== "function") {
        reject(new Error("Run this command in an interactive terminal."));
        return;
    }

    terminalOutput.write(question);
    terminalInput.setRawMode(true);
    terminalInput.resume();
    let value = "";

    const cleanup = () => {
        terminalInput.off("data", handleInput);
        terminalInput.setRawMode(false);
        terminalOutput.write("\n");
    };

    const handleInput = (chunk) => {
        for (const character of chunk.toString("utf8")) {
            if (character === "\u0003") {
                cleanup();
                reject(new Error("Admin creation cancelled."));
                return;
            }
            if (character === "\r" || character === "\n") {
                cleanup();
                resolve(value);
                return;
            }
            if (character === "\u007f" || character === "\b") {
                value = Array.from(value).slice(0, -1).join("");
            } else if (character >= " ") {
                value += character;
            }
        }
    };

    terminalInput.on("data", handleInput);
});

let connected = false;

try {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing from server/.env.");
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        connected = true;
    } catch {
        throw new Error("Could not connect to MongoDB. Check server/.env and database connectivity.");
    }

    let existingAdmin;
    try {
        existingAdmin = await UserModel.exists({ role: "ADMIN" });
    } catch {
        throw new Error("Could not check for an existing admin account.");
    }
    if (existingAdmin) {
        throw new Error("An ADMIN account already exists; refusing to create another.");
    }

    const name = await ask("Admin name: ");
    const email = (await ask("Admin email: ")).toLowerCase();
    const mobileInput = await ask("Mobile number: ");

    if (!name) {
        throw new Error("Name is required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
    }
    if (!/^\d+$/.test(mobileInput) || !Number.isSafeInteger(Number(mobileInput))) {
        throw new Error("Mobile number must contain digits only and fit the user model's numeric field.");
    }

    let existingUser;
    try {
        existingUser = await UserModel.exists({ email });
    } catch {
        throw new Error("Could not check whether that email is already registered.");
    }
    if (existingUser) {
        throw new Error("That email already belongs to a user; refusing to change its role.");
    }

    prompts.close();
    const password = await askHidden("Admin password (input hidden): ");
    const passwordConfirmation = await askHidden("Confirm password (input hidden): ");

    if (!password) {
        throw new Error("Password is required.");
    }
    if (password !== passwordConfirmation) {
        throw new Error("Passwords do not match.");
    }

    const user = new UserModel({
        name,
        email,
        mobile: Number(mobileInput),
        password: await hashPassword(password),
        role: "ADMIN"
    });

    try {
        await user.save();
    } catch {
        throw new Error("Could not create the admin account. The email may already be in use.");
    }

    terminalOutput.write(`Created ADMIN account for ${email}.\n`);
} catch (error) {
    terminalOutput.write(`Admin creation failed: ${error.message}\n`);
    process.exitCode = 1;
} finally {
    prompts.close();
    if (connected) {
        await mongoose.disconnect().catch(() => {});
    }
}