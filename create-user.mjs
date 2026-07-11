import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = 'rahulbadugu22@gmail.com';
const password = '7981255989';

async function createAdminUser() {
  try {
    console.log(`Attempting to create user ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`User created in Auth with UID: ${user.uid}`);
    
    // Add user to users collection so they bypass the 'no user doc found' fallback if needed, or just let them fall back to Super Admin.
    // Actually, if we add them to the users collection without a roleId, they might get 'Staff' role. 
    // To ensure they get Super Admin, it's safer to just let the fallback handle them if they don't have a doc, or create a doc with a known super admin role.
    // The fallback in admin/page.tsx: "No user doc found -> original super admin". So if they just exist in Auth, they get Super Admin!
    // But let's create a doc just in case. Wait, if I create a doc without roleId, they become Staff with NO permissions! 
    // Let me NOT create a document in the users collection, so they fall back to Super Admin automatically.
    
    console.log('Success! User is now a Super Admin (via fallback).');
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('User already exists in Firebase Auth. That means they can log in!');
      process.exit(0);
    } else {
      console.error('Error creating user:', error);
      process.exit(1);
    }
  }
}

createAdminUser();
