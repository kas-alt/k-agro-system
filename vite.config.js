import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const firebaseConfig = {
  apiKey: "AIzaSyDalk_OcLwovEi0oUyXIszL2KK_3gPl7q8",
  authDomain: "k-agro-erp.firebaseapp.com",
  projectId: "k-agro-erp",
  storageBucket: "k-agro-erp.firebasestorage.app",
  messagingSenderId: "935148647262",
  appId: "1:935148647262:web:5ccf50dc2a422960a855cf"
};

export default defineConfig({
  plugins: [react()],
  define: {
    __firebase_config: JSON.stringify(JSON.stringify(firebaseConfig)),
    __app_id: JSON.stringify('k-agro-erp-v1'),
    __initial_auth_token: JSON.stringify(''),
  },
})
