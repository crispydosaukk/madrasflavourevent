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

async function createCalendarTable() {
  console.log("Accessing database to create 'blocked_dates' collection and store initial blocked dates...");
  try {
    const datesToBlock = ["2026-05-25", "2026-12-25", "2026-01-01"];
    for (const date of datesToBlock) {
      await setDoc(doc(db, "blocked_dates", date), { date });
      console.log(`Success! Blocked date: ${date}`);
    }
    console.log("Success! Created 'blocked_dates' table and initialized records.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating blocked_dates table:", error);
    process.exit(1);
  }
}

createCalendarTable();
