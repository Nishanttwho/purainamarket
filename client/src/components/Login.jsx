/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Phone, ShoppingBasket, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { GoogleLogin } from "@react-oauth/google";
import fullLogo from "../assets/plogo.png";
import summaryApi from "../common/summaryApi";
import { setUserDetails } from "../store/userSlice";
import Axios from "../utils/Axios";
import fetchUserDetails from "../utils/fetchUserDetails";
import "./Login.css";
import { clearPendingReferralCode, getPendingReferralCode } from "../utils/referralAttribution";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const normalizeIdentifier = (value) => {
    const trimmed = value.trim();
    if (trimmed.includes("@")) return trimmed.toLowerCase();

    let digits = trimmed.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    return digits;
};

const isValidIdentifier = (value) => {
    const normalized = normalizeIdentifier(value);
    return normalized.includes("@") ? emailPattern.test(normalized) : /^\d{10}$/.test(normalized);
};

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete, error }) {
    return (
        <label className="auth-field">
            <span className="auth-label">{label}</span>
            <span className={`auth-input-wrap ${error ? "auth-input-error" : ""}`}>
                <input
                    className="auth-input auth-password-input"
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    required
                />
                <button
                    className="auth-icon-button auth-password-toggle"
                    type="button"
                    onClick={onToggle}
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </span>
        </label>
    );
}

const Login = ({ setIsLoginOpen }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [step, setStep] = useState("identifier");
    const [identifier, setIdentifier] = useState("");
    const [registration, setRegistration] = useState({
        name: "",
        email: "",
        mobile: "",
        password: "",
        confirmPassword: ""
    });
    const [referralCode] = useState(() => getPendingReferralCode());
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setIsLoginOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [setIsLoginOpen]);

    const close = () => setIsLoginOpen(false);
    const transition = { duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] };

    const handleContinue = async (event) => {
        event.preventDefault();
        setError("");

        if (!isValidIdentifier(identifier)) {
            setError("Enter a valid email address or 10-digit mobile number.");
            return;
        }

        const normalized = normalizeIdentifier(identifier);
        const startedAt = Date.now();
        setStep("checking");

        try {
            const response = await Axios({
                ...summaryApi.checkAccount,
                data: { identifier: normalized },
                timeout: 10000
            });
            await wait(Math.max(0, 360 - (Date.now() - startedAt)));

            const exists = response.data?.data?.exists;
            if (response.data?.success !== true || typeof exists !== "boolean") {
                throw new Error("We could not verify this account. Please try again.");
            }

            if (exists) {
                setStep("password");
                return;
            }

            setRegistration((current) => ({
                ...current,
                email: normalized.includes("@") ? normalized : "",
                mobile: normalized.includes("@") ? "" : normalized
            }));
            setStep("register");
        } catch (requestError) {
            setStep("identifier");
            setError(requestError.response?.data?.message || "We could not check that account. Please try again.");
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setBusy(true);

        try {
            const response = await Axios({
                ...summaryApi.login,
                data: { identifier: normalizeIdentifier(identifier), password }
            });

            if (!response.data.success) {
                setError(response.data.message || "We could not sign you in. Please try again.");
                return;
            }

            localStorage.setItem("accessToken", response.data.data.accessToken);
            localStorage.setItem("refreshToken", response.data.data.refreshToken);
            const userDetails = await fetchUserDetails();
            if (userDetails?.data) dispatch(setUserDetails(userDetails.data));
            close();
            clearPendingReferralCode();
            const role = response.data.data.role || userDetails?.data?.role;
            navigate(role === "RIDER" ? "/rider" : role === "ADMIN" ? "/dashboard" : "/");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "That password did not match this account.");
        } finally {
            setBusy(false);
        }
    };

    const handleGoogleLogin = async ({ credential } = {}) => {
        setError("");
        if (!credential) {
            setError("Google sign-in did not return a credential. Please try again.");
            return;
        }

        setBusy(true);
        try {
            const response = await Axios({
                ...summaryApi.googleLogin,
                data: { credential, referralCode }
            });
            if (!response.data.success) {
                setError(response.data.message || "We could not sign you in with Google.");
                return;
            }

            localStorage.setItem("accessToken", response.data.data.accessToken);
            localStorage.setItem("refreshToken", response.data.data.refreshToken);
            const userDetails = await fetchUserDetails();
            if (userDetails?.data) dispatch(setUserDetails(userDetails.data));
            close();
            clearPendingReferralCode();
            const role = response.data.data.role || userDetails?.data?.role;
            navigate(role === "RIDER" ? "/rider" : role === "ADMIN" ? "/dashboard" : "/");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Google sign-in failed. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setError("");

        if (!registration.name.trim() || !emailPattern.test(registration.email.trim())) {
            setError("Enter your name and a valid email address.");
            return;
        }
        if (!/^\d{10}$/.test(normalizeIdentifier(registration.mobile))) {
            setError("Enter a valid 10-digit mobile number.");
            return;
        }
        if (registration.password !== registration.confirmPassword) {
            setError("Your passwords do not match.");
            return;
        }

        setBusy(true);
        try {
            const response = await Axios({
                ...summaryApi.register,
                data: {
                    name: registration.name.trim(),
                    email: registration.email.trim().toLowerCase(),
                    mobile: normalizeIdentifier(registration.mobile),
                    password: registration.password,
                    referralCode
                }
            });

            if (!response.data.success) {
                setError(response.data.message || "We could not create your account. Please try again.");
                return;
            }

            localStorage.setItem("accessToken", response.data.data.accessToken);
            localStorage.setItem("refreshToken", response.data.data.refreshToken);
            const userDetails = await fetchUserDetails();
            if (userDetails?.data) dispatch(setUserDetails(userDetails.data));
            close();
            clearPendingReferralCode();
            navigate("/");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We could not create your account. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const backToIdentifier = () => {
        setError("");
        setPassword("");
        setStep("identifier");
    };

    const updateRegistration = (key) => (event) => {
        setRegistration((current) => ({ ...current, [key]: event.target.value }));
        setError("");
    };

    const screenMotion = {
        initial: { opacity: 0, x: reduceMotion ? 0 : 14 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: reduceMotion ? 0 : -10 },
        transition
    };

    return (
        <motion.div
            className="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <motion.section
                className="auth-card"
                role="dialog"
                aria-modal="true"
                aria-label="Sign in or create an account"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 14, scale: reduceMotion ? 1 : 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.99 }}
                transition={transition}
            >
                <aside className="auth-brand-panel">
                    <motion.div
                        className="auth-brand-logo"
                        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...transition, delay: reduceMotion ? 0 : 0.08 }}
                    >
                        <img src={fullLogo} alt="PurainaMarket" />
                    </motion.div>
                    <div className="auth-brand-message">
                        <span className="auth-brand-eyebrow"><ShoppingBasket size={16} /> Your neighborhood store</span>
                        <h2>Good things,<br />right on time.</h2>
                        <p>Fresh picks and everyday favourites, ready when you are.</p>
                    </div>
                    <div className="auth-brand-foot">
                        <span className="auth-brand-dot" /> Groceries made easy
                    </div>
                </aside>

                <div className="auth-content">
                    <div className="auth-mobile-head">
                        <img src={fullLogo} alt="PurainaMarket" />
                        <button className="auth-icon-button auth-close" type="button" onClick={close} aria-label="Close sign in">
                            <X size={20} />
                        </button>
                    </div>
                    <button className="auth-icon-button auth-desktop-close" type="button" onClick={close} aria-label="Close sign in">
                        <X size={20} />
                    </button>

                    <div className="auth-flow" aria-live="polite">
                        <AnimatePresence mode="wait" initial={false}>
                            {step === "checking" ? (
                                <motion.div className="auth-checking" key="checking" {...screenMotion}>
                                    <span className="auth-loader" aria-hidden="true" />
                                    <h1>One moment</h1>
                                    <p>Checking your account details…</p>
                                </motion.div>
                            ) : null}

                            {step === "identifier" ? (
                                <motion.div className="auth-screen" key="identifier" {...screenMotion}>
                                    <span className="auth-step-label">WELCOME TO PURAINAMARKET</span>
                                    <h1>Good to see you.</h1>
                                    <p className="auth-subtitle">Sign in or create an account to get your essentials delivered.</p>
                                    <form className="auth-form" onSubmit={handleContinue}>
                                        <label className="auth-field">
                                            <span className="auth-label">Email or mobile number</span>
                                            <span className={`auth-input-wrap ${error ? "auth-input-error" : ""}`}>
                                                {identifier.includes("@") ? <Mail className="auth-input-icon" size={18} /> : <Phone className="auth-input-icon" size={18} />}
                                                <input
                                                    className="auth-input auth-identifier-input"
                                                    type="text"
                                                    inputMode="email"
                                                    autoComplete="username"
                                                    placeholder="you@example.com or 98765 43210"
                                                    value={identifier}
                                                    onChange={(event) => {
                                                        setIdentifier(event.target.value);
                                                        setError("");
                                                    }}
                                                    autoFocus
                                                />
                                            </span>
                                        </label>
                                        {error && <motion.p className="auth-error" key={error} initial={{ opacity: 0 }} animate={{ opacity: 1, x: reduceMotion ? 0 : [0, -4, 4, 0] }}>{error}</motion.p>}
                                        <motion.button className="auth-primary" type="submit" whileHover={reduceMotion ? undefined : { y: -1 }} whileTap={reduceMotion ? undefined : { scale: 0.99 }}>
                                            Continue <ArrowRight size={18} />
                                        </motion.button>
                                    </form>
                                    <div className="auth-google-section">
                                        <div className="auth-divider"><span>or</span></div>
                                        <div className="auth-google-control">
                                            {googleClientId ? (
                                                <GoogleLogin
                                                    onSuccess={handleGoogleLogin}
                                                    onError={() => setError("Google sign-in failed. Please try again.")}
                                                    text="continue_with"
                                                    theme="outline"
                                                    shape="rectangular"
                                                    size="large"
                                                    width={Math.max(200, Math.min(370, window.innerWidth - 48))}
                                                />
                                            ) : (
                                                <button className="auth-google-fallback" type="button" onClick={() => setError("Google sign-in is not configured yet.")}>
                                                    <FcGoogle size={20} /> Continue with Google
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}

                            {step === "password" ? (
                                <motion.div className="auth-screen" key="password" {...screenMotion}>
                                    <button className="auth-back-link" type="button" onClick={backToIdentifier}>
                                        <ArrowLeft size={17} /> Change email or mobile
                                    </button>
                                    <span className="auth-step-label">WELCOME BACK</span>
                                    <h1>Enter your password.</h1>
                                    <p className="auth-identity">{identifier}</p>
                                    <form className="auth-form" onSubmit={handleLogin}>
                                        <PasswordField
                                            label="Password"
                                            value={password}
                                            onChange={(event) => { setPassword(event.target.value); setError(""); }}
                                            visible={showPassword}
                                            onToggle={() => setShowPassword((visible) => !visible)}
                                            autoComplete="current-password"
                                            error={error}
                                        />
                                        <div className="auth-form-row">
                                            {error && <motion.p className="auth-error" key={error} initial={{ opacity: 0 }} animate={{ opacity: 1, x: reduceMotion ? 0 : [0, -4, 4, 0] }}>{error}</motion.p>}
                                            <button className="auth-text-button" type="button" onClick={() => { close(); navigate("/forgot-password"); }}>
                                                Forgot password?
                                            </button>
                                        </div>
                                        <motion.button className="auth-primary" type="submit" disabled={busy || !password} whileHover={reduceMotion || busy ? undefined : { y: -1 }} whileTap={reduceMotion || busy ? undefined : { scale: 0.99 }}>
                                            {busy ? <><span className="auth-button-spinner" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            ) : null}

                            {step === "register" ? (
                                <motion.div className="auth-screen auth-register-screen" key="register" {...screenMotion}>
                                    <button className="auth-back-link" type="button" onClick={backToIdentifier}>
                                        <ArrowLeft size={17} /> Change email or mobile
                                    </button>
                                    <span className="auth-step-label">NEW TO PURAINAMARKET?</span>
                                    <h1>Let’s get you started.</h1>
                                    <p className="auth-subtitle">A few details and your basket is ready.</p>
                                    {referralCode && <p className="auth-identity">Referral code {referralCode} will be applied to your signup.</p>}
                                    <form className="auth-form auth-register-form" onSubmit={handleRegister}>
                                        <label className="auth-field">
                                            <span className="auth-label">Full name</span>
                                            <input className="auth-input auth-plain-input" type="text" autoComplete="name" value={registration.name} onChange={updateRegistration("name")} required />
                                        </label>
                                        <label className="auth-field">
                                            <span className="auth-label">Email address</span>
                                            <input className="auth-input auth-plain-input" type="email" autoComplete="email" value={registration.email} onChange={updateRegistration("email")} required />
                                        </label>
                                        <label className="auth-field">
                                            <span className="auth-label">Mobile number</span>
                                            <input className="auth-input auth-plain-input" type="tel" inputMode="tel" autoComplete="tel-national" value={registration.mobile} onChange={updateRegistration("mobile")} required />
                                        </label>
                                        <PasswordField
                                            label="Create password"
                                            value={registration.password}
                                            onChange={updateRegistration("password")}
                                            visible={showPassword}
                                            onToggle={() => setShowPassword((visible) => !visible)}
                                            autoComplete="new-password"
                                            error={error}
                                        />
                                        <PasswordField
                                            label="Confirm password"
                                            value={registration.confirmPassword}
                                            onChange={updateRegistration("confirmPassword")}
                                            visible={showConfirmPassword}
                                            onToggle={() => setShowConfirmPassword((visible) => !visible)}
                                            autoComplete="new-password"
                                            error={error}
                                        />
                                        {error && <motion.p className="auth-error" key={error} initial={{ opacity: 0 }} animate={{ opacity: 1, x: reduceMotion ? 0 : [0, -4, 4, 0] }}>{error}</motion.p>}
                                        <motion.button className="auth-primary" type="submit" disabled={busy} whileHover={reduceMotion || busy ? undefined : { y: -1 }} whileTap={reduceMotion || busy ? undefined : { scale: 0.99 }}>
                                            {busy ? <><span className="auth-button-spinner" /> Creating account…</> : <>Create account <ArrowRight size={18} /></>}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    <div className="auth-legal">
                        By continuing, you agree to our <span>Terms of Service</span> and <span>Privacy Policy</span>.
                    </div>
                </div>
            </motion.section>
        </motion.div>
    );
};

export default Login;
