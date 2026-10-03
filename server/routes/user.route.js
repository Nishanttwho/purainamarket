import {Router} from "express"
import { 
    checkAccountController,
    forgotPasswordController, 
    googleLoginController,
    loginUserController, 
    myReferralsController,
    logoutController, 
    refreshTokenController, 
    registerUserController, 
    resetPasswordController, 
    updateUserDetailsController, 
    uploadAvatar, 
    userDetailsController, 
    verifyForgotPasswordOTPController, 
    verifyUserController 
} from "../controllers/user.controller.js"
import authMiddleware from "../middleware/authMiddleware.js"
import requireRole from "../middleware/requireRole.js"
import {
    deleteAdminUserController,
    getAdminUserDetailsController,
    listAdminUsersController,
    updateAdminUserStatusController
} from "../controllers/adminUsers.controller.js"
import upload from "../middleware/multer.js"

const userRoutes = Router()

userRoutes.post("/register", registerUserController)
userRoutes.post("/check-account", checkAccountController)
userRoutes.post("/verify-email", verifyUserController)
userRoutes.post("/login", loginUserController)
userRoutes.post("/google-login", googleLoginController)
userRoutes.get("/logout", authMiddleware, logoutController)
userRoutes.put("/upload-avatar", authMiddleware, upload.single("avatar"), uploadAvatar)
userRoutes.put("/update-user", authMiddleware, updateUserDetailsController)
userRoutes.put("/forgot-password", forgotPasswordController)
userRoutes.put("/verify-forgot-password-otp", verifyForgotPasswordOTPController)
userRoutes.put("/reset-password", resetPasswordController)
userRoutes.post("/refresh-token", refreshTokenController)
userRoutes.get("/get-user-details", authMiddleware, userDetailsController)
userRoutes.get("/referrals", authMiddleware, myReferralsController)
userRoutes.get("/admin/users", authMiddleware, requireRole("ADMIN"), listAdminUsersController)
userRoutes.get("/admin/users/:id", authMiddleware, requireRole("ADMIN"), getAdminUserDetailsController)
userRoutes.put("/admin/users/:id/status", authMiddleware, requireRole("ADMIN"), updateAdminUserStatusController)
userRoutes.delete("/admin/users/:id", authMiddleware, requireRole("ADMIN"), deleteAdminUserController)

export default userRoutes

