import UserModel from "../models/user.model.js";

const requireRole = (role) => async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.userId).select("role").lean();
        if (!user || user.role !== role) {
            return res.status(403).json({
                message: `Only ${role.toLowerCase()} accounts can access this endpoint.`,
                success: false,
                error: true
            });
        }

        next();
    } catch {
        return res.status(500).json({
            message: "Unable to verify account permissions.",
            success: false,
            error: true
        });
    }
};

export default requireRole;