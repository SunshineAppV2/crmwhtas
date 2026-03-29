import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: (process.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: (process.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: (process.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
  storageBucket: (process.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim(),
  messagingSenderId: (process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: (process.env.VITE_FIREBASE_APP_ID || "").trim(),
  measurementId: (process.env.VITE_FIREBASE_MEASUREMENT_ID || "").trim()
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP_TOKEN = (process.env.VITE_WHATSAPP_TOKEN || "").trim();
const PHONE_NUMBER_ID = (process.env.VITE_WHATSAPP_PHONE_NUMBER_ID || "").trim();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { to, text, customerId } = req.body;

  if (!to || !text || !customerId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // 1. Send TO Meta API
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.trim(),
        type: "text",
        text: { body: text.normalize('NFKD') }
      })
    });

    const result = await response.json();

    if (result.error) {
      console.error('META_API_ERROR:', result.error);
      return res.status(500).json({ error: 'Meta API Error', details: result.error });
    }

    // 2. Record it in the Interaction History of the CRM
    await addDoc(collection(db, 'interactions'), {
      customer_id: customerId,
      interaction_type: 'agent_message', // To style it as 'Sent' in the UI
      content: text,
      created_at: serverTimestamp()
    });

    return res.status(200).json({ status: 'success', result });
  } catch (error: any) {
    console.error('SEND_MESSAGE_CRITICAL_FAIL:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
