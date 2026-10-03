import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RouterProvider } from 'react-router-dom'
import router from './routes/index.jsx'
import { store } from './store/store.js'
import { Provider } from 'react-redux'
import { CartProvider } from './provider/CartContext.jsx'
import { AddressProvider } from './provider/AddressContext.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <Provider store={store}>
      <AddressProvider>
        <CartProvider>
          <RouterProvider router={router}>
              <App />
          </RouterProvider>
        </CartProvider>
      </AddressProvider>
    </Provider>
  </GoogleOAuthProvider>
)
