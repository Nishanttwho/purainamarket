import {hashPassword,  comparePasswords} from "../helper/passwordHashng.js";
import sendEmail from "../helper/sendEmail.js";
import UserModel from "../models/user.model.js";
import generateAccessToken from "../utils/generateAccessToken.js";
import generateRefreshToken from "../utils/generateRefreshToken.js";
import uploadImgCloudinary from "../utils/uploadImgCloudinary.js";
import verificationEmailTemplate from "../utils/verificationEmailTemplate.js";
import dotenv from "dotenv"
import generateOTP from "../utils/generateOTP.js";
import forgotPasswordEmailTemplate from "../utils/forgotPasswordEmailTemplate.js";
import resetPasswordConfirmationTemplate from "../utils/resetPasswordConfirmationTemplate.js";
import jwt from "jsonwebtoken"
import deleteImgCloudinary from "../utils/deleteImgCloudinary.js";
import { randomBytes } from "crypto";
import googleAuthClient from "../config/googleAuth.js";
import ReferralModel from "../models/referral.model.js";
import { findReferralInviter, ReferralAttributionError, recordReferralAttribution } from "../utils/referralAttribution.js";

dotenv.config();

const getUserQueryFromIdentifier = (identifier) => {
    if (typeof identifier !== "string") return null;

    const value = identifier.trim();
    if (!value) return null;
    if (value.includes("@")) {
        const escapedEmail = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return { email: { $regex: `^${escapedEmail}$`, $options: "i" } };
    }
    if (!/^[+\d\s().-]+$/.test(value)) return null;

    let digits = value.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
        digits = digits.slice(2);
    }
    if (!/^\d{10}$/.test(digits)) return null;

    return { mobile: Number(digits) };
};

//register user
export const createRegisterUserController = (sendEmailImpl = sendEmail) => async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;
        const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode.trim().toUpperCase() : "";

        if (!name || !email || !password || !mobile) {
            return res.status(400).json({
                message: "Please fill the required fields!",
                error: true,
                success: false
            });
        }

        const existingUser = await UserModel.findOne({ $or: [{ email }, { mobile }] });

        if (existingUser) {
            return res.status(400).json({
                message: existingUser.email === email 
                    ? "Email is already registered!" 
                    : "Mobile number is already registered!",
                error: true,
                success: false
            });
        }

        const hashedPassword = await hashPassword(password);

        let inviter;
        try { inviter = await findReferralInviter(referralCode); }
        catch (error) { if (error instanceof ReferralAttributionError) return res.status(error.status).json({ message: error.message, error: true, success: false }); throw error; }
        const newUser = new UserModel({
            name,
            email,
            password: hashedPassword,
            mobile
        });

        const savedUser = await newUser.save();

        await recordReferralAttribution({ inviter, referredUserId: savedUser._id, referralCode });

        const verifyEmailURL = `${process.env.CLIENT_URL}/verify-email?code=${savedUser._id}`;

        await sendEmailImpl({
            sendTo: email,
            subject: "Verification Email from PurainaMarket",
            html: verificationEmailTemplate({
                name: savedUser.name,
                url: verifyEmailURL,
            }),
        });

        // Auto-login after successful registration
        const accessToken = await generateAccessToken(savedUser._id);
        const refreshToken = await generateRefreshToken(savedUser._id);

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        };

        res.cookie("accessToken", accessToken, cookiesOption);
        res.cookie("refreshToken", refreshToken, cookiesOption);

        return res.status(201).json({
            message: "User registered successfully and logged in.",
            error: false,
            success: true,
            data: {
                user: savedUser,
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        // console.error("Error in registerUserController:", error);
        if (error instanceof ReferralAttributionError) return res.status(error.status).json({ message: error.message, error: true, success: false });
        return res.status(500).json({
            message: "Internal server error.",
            error: true,
            success: false
        });
    }
};

export const registerUserController = createRegisterUserController();

//verify user
export const verifyUserController = async (req, res) => {
    try {
        const { code } = req.body;

        // Find and update the user's email verification status
        const user = await UserModel.findOneAndUpdate(
            { _id: code },
            { $set: { verify_email: true } },
        );

        if (!user) {
            return res.status(400).json({
                message: "Invalid Code",
                error: true,
                success: false,
            });
        }

        // Respond with success message
        return res.status(200).json({
            message: "Email verified successfully",
            error: false,
            success: true,
        });
    } catch (error) {
        // Handle errors
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};

//login user
export const checkAccountController = async (req, res) => {
    try {
        const query = getUserQueryFromIdentifier(req.body?.identifier);
        if (!query) {
            return res.status(400).json({
                message: "Enter a valid email address or 10-digit mobile number.",
                error: true,
                success: false
            });
        }

        const user = await UserModel.exists(query);
        return res.status(200).json({
            message: "Account check complete.",
            error: false,
            success: true,
            data: { exists: Boolean(user) }
        });
    } catch {
        return res.status(500).json({
            message: "Unable to check this account right now.",
            error: true,
            success: false
        });
    }
};

export const loginUserController = async (req, res) => {
    try {
        const { email, identifier, password } = req.body;
        const query = getUserQueryFromIdentifier(identifier ?? email);

        if (!query || !password) {
            return res.status(400).json({
                message: "A valid email or mobile number and password are required.",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findOne(query)

        if(!user) {
            return res.status(400).json({
                message: "Invalid email, mobile number, or password.",
                error: true,
                success: false,
            });
        }

        if(user.status !== "Active") {
            return res.satus(400).json({
                message: `Your account is ${user.status}, Please contact to admin!`,
                error: true,
                success: false
            })
        }

        const isPasswordMatch = await comparePasswords(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Invalid email, mobile number, or password.",
                error: true,
                success: false,
            });
        }
        
        const accessToken = await generateAccessToken(user._id)
        const refreshToken = await generateRefreshToken(user._id)

        const updateUser = await UserModel.findByIdAndUpdate(user?._id, {
            last_login_date: new Date()
        })

        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        res.cookie('accessToken',accessToken,cookiesOption)
        res.cookie('refreshToken',refreshToken,cookiesOption)

        return res.status(200).json({
            message: "Login successfully.",
            error: false,
            success: true,
            data: {
                accessToken,
                refreshToken,
                role: user.role
            }
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}

export const googleLoginController = async (req, res) => {
    try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const credential = req.body?.credential;
        if (!googleClientId) {
            return res.status(503).json({ message: "Google sign-in is not configured.", error: true, success: false });
        }
        if (typeof credential !== "string" || credential.length > 8192) {
            return res.status(400).json({ message: "A valid Google credential is required.", error: true, success: false });
        }

        let payload;
        try {
            const ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: googleClientId });
            payload = ticket.getPayload();
        } catch {
            return res.status(401).json({ message: "Google authentication could not be verified.", error: true, success: false });
        }

        const now = Math.floor(Date.now() / 1000);
        const validIssuer = payload?.iss === "https://accounts.google.com" || payload?.iss === "accounts.google.com";
        const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
        if (!payload || payload.aud !== googleClientId || !validIssuer
            || !Number.isFinite(payload.exp) || payload.exp <= now
            || !Number.isFinite(payload.iat) || payload.iat > now + 60
            || payload.email_verified !== true
            || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(401).json({ message: "Google authentication could not be verified.", error: true, success: false });
        }

        let user = await UserModel.findOne({ googleId: payload.sub });
        if (!user) {
            const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const existingEmailUser = await UserModel.findOne({ email: { $regex: `^${escapedEmail}$`, $options: "i" } });
            if (existingEmailUser) {
                if (existingEmailUser.googleId && existingEmailUser.googleId !== payload.sub) {
                    return res.status(409).json({ message: "This Google account is linked to another account.", error: true, success: false });
                }
                try {
                    user = await UserModel.findByIdAndUpdate(
                        existingEmailUser._id,
                        { $set: { googleId: payload.sub, verify_email: true } },
                        { new: true, runValidators: true }
                    );
                } catch (error) {
                    if (error?.code === 11000) {
                        return res.status(409).json({ message: "This Google account is linked to another account.", error: true, success: false });
                    }
                    throw error;
                }
                if (!user) throw new Error("The existing account could not be linked.");
            }

            const password = await hashPassword(randomBytes(48).toString("base64url"));
            const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode.trim().toUpperCase() : "";
            let inviter;
            try { inviter = await findReferralInviter(referralCode); }
            catch (error) { if (error instanceof ReferralAttributionError) return res.status(error.status).json({ message: error.message, error: true, success: false }); throw error; }
            user = new UserModel({
                name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0],
                email,
                googleId: payload.sub,
                password,
                mobile: null,
                avatar: typeof payload.picture === "string" ? payload.picture : "",
                verify_email: true,
                role: "USER"
            });
            try {
                user = await user.save();
                await recordReferralAttribution({ inviter, referredUserId: user._id, referralCode });
            } catch (error) {
                if (error?.code !== 11000) throw error;
                user = await UserModel.findOne({ googleId: payload.sub });
                if (!user) {
                    return res.status(409).json({ message: "An account already uses this email. Please sign in using that account's existing method.", error: true, success: false });
                }
            }
        }

        if (user.status !== "Active") {
            return res.status(403).json({ message: `Your account is ${user.status}. Please contact support.`, error: true, success: false });
        }

        await UserModel.findByIdAndUpdate(user._id, { last_login_date: new Date() });
        const accessToken = await generateAccessToken(user._id);
        const refreshToken = await generateRefreshToken(user._id);
        const cookiesOption = { httpOnly: true, secure: true, sameSite: "None" };
        res.cookie("accessToken", accessToken, cookiesOption);
        res.cookie("refreshToken", refreshToken, cookiesOption);

        return res.status(200).json({
            message: "Login successfully.",
            error: false,
            success: true,
            data: { accessToken, refreshToken, role: user.role }
        });
    } catch (error) {
        if (error instanceof ReferralAttributionError) return res.status(error.status).json({ message: error.message, error: true, success: false });
        if (error?.code === 11000) {
            return res.status(409).json({ message: "An account already uses this email. Please sign in using that account's existing method.", error: true, success: false });
        }
        return res.status(500).json({ message: "Google sign-in could not be completed.", error: true, success: false });
    }
};

//Logout user
export const logoutController = async (req, res) => {
    try {

        
        const userId = req.userId //from middleware
        // console.log("userId: ", userId)

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        res.clearCookie("accessToken", cookiesOption)
        res.clearCookie("refreshToken", cookiesOption)

        const removeRefreshToken = await UserModel.findByIdAndUpdate(userId, 
            {
                refresh_token: ""
            })

        return res.status(200).json({
            message: "Logged out successfully.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error:true,
            success: false
        })
    }
}

//upload user avatar
export const uploadAvatar = async (req, res) => {
    try {

        const userId = req.userId //from authMiddleware
        const image = req.file //from multer middleware
        // console.log("Image: ", image);

        // Get user's current avatar URL
        const user = await UserModel.findById(userId);
        const oldAvatarUrl = user?.avatar;

        if (oldAvatarUrl && oldAvatarUrl !== ""){
            deleteImgCloudinary(oldAvatarUrl, "profile")
        }

        const upload = await uploadImgCloudinary(image, "profile")
        // console.log(upload);

        const updateUser = await UserModel.findByIdAndUpdate(userId, {
            avatar: upload.url
        })

        return res.status(200).json({
            message: "Avatar uploaded successfully",
            error:false,
            success: true,
            data: {
                _id: userId,
                avatar: upload.url
            }
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error:true,
            success: false
        })
    }
}

//update user details
export const updateUserDetailsController = async (req, res) => {
    try {
        
        const userId = req.userId //from authMiddleware
        const {name , email, mobile, password} = req.body

        //check if mobile already exist with other account or not
        if (mobile) {
            const checkMobile = await UserModel.findOne({
                mobile: mobile,
                _id: { $ne: userId }, // Exclude the current user
            });

            if (checkMobile) {
                return res.status(400).json({
                    message: "This mobile number is already associated with another account.",
                    error: true,
                    success: false,
                });
            }
        }

        // Hash the password
        let hashedPassword
        if(password) {
            hashedPassword = await hashPassword(password);
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            userId, {
                ...(name && {name: name}),
                ...(email && {email: email}),
                ...(mobile && {mobile: mobile}),
                ...(password && {password: hashedPassword})
            },
            { new: true } // To return the updated user
        )

        return res.status(200).json({
            message: "Updated successfully.",
            error: false,
            success: true,
            data: updatedUser
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error:true,
            success: false,
        })
    }
}

//forgot password for not login
export const forgotPasswordController = async (req, res) => {
    try {
        const {email} = req.body

        if(!email?.trim()) {
            return res.status(400).json({
                message: "Please provide Email!",
                error: true,
                success: false
            })
        }

        const user = await UserModel.findOne({email})
        if(!user) {
            return res.status(400).json({
                message: "Email does not exist!",
                error: true,
                success: false
            })
        }

        const otp = generateOTP()
        const otpExpireTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const update = await UserModel.findByIdAndUpdate(user._id, {
            forgot_password_otp: otp,
            forgot_password_expiry: new Date(otpExpireTime).toISOString()
        })

        await sendEmail({
            sendTo: email,
            subject: "Forgot Password from PurainaMarket.",
            html: forgotPasswordEmailTemplate({
                name: user.name, 
                otp: otp
            })
        })

        return res.status(200).json({
            message: "check your Email",
            error: false,
            success: true,
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error:true,
            success: false
        })
    }
}

//verify forgot password OTP
export const verifyForgotPasswordOTPController = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Please provide both Email and OTP!",
                error: true,
                success: false
            });
        }
        
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Email does not exist!",
                error: true,
                success: false
            });
        }

        const currentTime = new Date();

        if (user.forgot_password_expiry < currentTime) {
            return res.status(400).json({
                message: "The OTP has expired. Please request a new one to proceed.",
                error: true,
                success: false
            });
        }

        if (otp !== user.forgot_password_otp) {
            return res.status(400).json({
                message: "The OTP you entered is incorrect. Please check and try again.",
                error: true,
                success: false
            });
        }

        // OTP is correct, now reset OTP field to prevent reuse
        await UserModel.updateOne(
            { email },
            { $set: { forgot_password_otp: null, forgot_password_expiry: null } }
        );

        return res.status(200).json({
            message: "OTP verified successfully.",
            error: false,
            success: true
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

//reset the password
export const resetPasswordController = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Please provide Email and Passwords!",
                error: true,
                success: false
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match! Please ensure both fields are identical.",
                error: true,
                success: false
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        const updatedUser = await UserModel.findOneAndUpdate(
            { email }, // Find the user by email
            { password: hashedPassword }, // Update the password
            { new: true } // Return the updated user
        );

        if (!updatedUser) {
            return res.status(400).json({
                message: "Email does not exist!",
                error: true,
                success: false
            });
        }

        // console.log("updatedUser: ", updatedUser);
        
        await sendEmail({
            sendTo: email,
            subject: "Your Password Has Been Successfully Reset - PurainaMarket",
            html: resetPasswordConfirmationTemplate({
                name: updatedUser.name,
                email: updatedUser.email,
                supportEmail: "support@yashh1524.com"
            })
        })

        return res.status(200).json({
            message: "Password updated successfully.",
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
};

//refresh token controller
export const refreshTokenController = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req?.header?.authorization?.split(" ")[1]

        if(!refreshToken) {
            return res.status(400).json({
                message: "Refresh Token not found!",
                error: true,
                success: false
            });
        }

        // console.log("refreshToken: ", refreshToken);
        const verifyToken = await jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN)
        
        if(!verifyToken) {
            return res.status(400).json({
                message: "Token is expired!",
                error: true,
                success: false
            });
        }

        // console.log("verifyToken: ", verifyToken);
        const userId = verifyToken.id

        const newAccessToken = await generateAccessToken(userId)
        
        const cookiesOption = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }
        res.cookie("accessToken", newAccessToken, cookiesOption)

        return res.status(200).json({
            message: "New accessToken generated.",
            error: false,
            success: true,
            data: {
                accessToken: newAccessToken
            }
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

//get login user details 
export const userDetailsController = async (req, res) => {
    try {
        const userId = req.userId

        const user = await UserModel.findById(userId).select("-password -refresh_token")

        if(!user) {
            return res.status(400).json({
                message: "User does not exist!",
                error: true,    
                success: false
            })
        }

        if (user.role === "USER" && !user.referralCode) {
            const code = `PM${user._id.toString().toUpperCase()}`;
            try {
                await UserModel.updateOne({ _id: user._id, referralCode: { $exists: false } }, { $set: { referralCode: code } });
            } catch (error) {
                if (error?.code !== 11000) throw error;
            }
            user.referralCode = (await UserModel.findById(user._id).select("referralCode").lean())?.referralCode;
        }

        return res.status(200).json({
            message: "user details",
            data: user,
            error: false,
            success: true
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

export const myReferralsController = async (req, res) => {
    try {
        let inviter = await UserModel.findById(req.userId).select("role referralCode");
        if (!inviter || inviter.role !== "USER") return res.status(403).json({ success: false, error: true, message: "Referral program is available to customer accounts." });
        if (!inviter.referralCode) {
            inviter.referralCode = `PM${req.userId.toString().toUpperCase()}`;
            await inviter.save();
        }
        const referrals = await ReferralModel.find({ inviterId: req.userId })
            .populate("rewardCouponId", "code expiresAt")
            .populate("referredUserId", "name")
            .populate("qualifyingOrderId", "orderId order_status subTotalAmt")
            .populate("latestOrderId", "orderId order_status subTotalAmt")
            .sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, error: false, data: { referralCode: inviter.referralCode, totalInvited: referrals.length, referrals } });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load referral details." });
    }
};
