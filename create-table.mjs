import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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

async function createTable() {
  console.log("Accessing database to create collection and store data...");
  try {
    const docRef = await addDoc(collection(db, "booking_requests"), {
      name: "System Setup",
      email: "setup@system.local",
      phone: "N/A",
      eventType: "Initialization",
      date: new Date().toISOString(),
      guests: 0,
      message: "This is an automatic entry created to initialize your database collection (table).",
      createdAt: new Date().toISOString()
    });
    console.log("Success! Created 'booking_requests' table and inserted record ID:", docRef.id);
    process.exit(0);
  } catch (error) {
    console.error("Error creating table:", error);
    process.exit(1);
  }
}

createTable();
