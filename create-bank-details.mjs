import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2_gsKckW49qbI7-aidn05ez8YdLTJgw8",
  authDomain: "honeymoonevents-f42eb.firebaseapp.com",
  projectId: "honeymoonevents-f42eb",
  storageBucket: "honeymoonevents-f42eb.firebasestorage.app",
  messagingSenderId: "231311467804",
  appId: "1:231311467804:web:ef9ada8821712a2c94c6d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeBankDetails() {
  console.log("Accessing database to initialize dynamic bank details under 'site_data/bank_details'...");
  try {
    const defaultDetails = {
      accountName: "Honeymoon Events Ltd",
      sortCode: "20-00-00",
      accountNumber: "12345678",
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "site_data", "bank_details"), defaultDetails, { merge: true });
    console.log("Success! Initialized bank account details in Firestore database.");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing bank details:", error);
    process.exit(1);
  }
}

initializeBankDetails();
