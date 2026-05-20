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

async function createBookingsTable() {
  console.log("Accessing database to create 'bookings' collection and store initial data...");
  try {
    const docRef = await addDoc(collection(db, "bookings"), {
      name: "System Setup Booking",
      email: "booking-setup@system.local",
      phone: "N/A",
      eventType: "Initialization",
      date: new Date().toISOString().split('T')[0],
      guests: 0,
      status: "menu_sent", // Initializing in booking status to appear in bookings module
      message: "This is an automatic entry created to initialize your bookings database collection (table).",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log("Success! Created 'bookings' table and inserted record ID:", docRef.id);
    process.exit(0);
  } catch (error) {
    console.error("Error creating bookings table:", error);
    process.exit(1);
  }
}

createBookingsTable();
