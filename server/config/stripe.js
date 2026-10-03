import stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const Stripe = stripeSecretKey ? stripe(stripeSecretKey) : null;

export default Stripe;