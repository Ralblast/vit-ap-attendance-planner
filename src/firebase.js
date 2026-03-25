import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDZV4Vx7mkvN50xz216mRlFTbcXW5REFlU',
  authDomain: 'vit-ap-planner.firebaseapp.com',
  projectId: 'vit-ap-planner',
  storageBucket: 'vit-ap-planner.firebasestorage.app',
  messagingSenderId: '397848457844',
  appId: '1:397848457844:web:ee3d2d4d98919a8dded721',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
