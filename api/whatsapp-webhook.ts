import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WHATSAPP_TOKEN = process.env.VITE_WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;

/**
 * Utility to send a WhatsApp message back via Meta API
 */
async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  try {
    await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text }
      })
    });
  } catch (err) {
    console.error('ERROR_SENDING_WHATSAPP:', err);
  }
}

export default async function handler(req: any, res: any) {
  const VERIFY_TOKEN = "Ascg@232430";

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from;
      const text = messageObj.text?.body || '';

      if (!text) return res.status(200).send('No text');

      try {
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('whatsapp_id', '==', from));
        const querySnapshot = await getDocs(q);

        let customerId = '';
        let isNew = false;
        
        if (querySnapshot.empty) {
          isNew = true;
          const newCustomer = await addDoc(customersRef, {
            whatsapp_id: from,
            name: `User ${from}`,
            stage_id: '1',
            ltv: 0,
            origin: 'WhatsApp Webhook',
            created_at: serverTimestamp()
          });
          customerId = newCustomer.id;
        } else {
          customerId = querySnapshot.docs[0].id;
        }

        // 1. Record the message context
        await addDoc(collection(db, 'interactions'), {
          customer_id: customerId,
          interaction_type: 'message',
          content: text,
          created_at: serverTimestamp()
        });

        // 2. Automate: Send Onboarding link for NEW customers
        if (isNew) {
          const welcomeText = `Olá! Seja bem-vindo ao nosso atendimento. 🚀\nPara agilizar o seu processo, por favor complete o seu cadastro no link abaixo:\n\nhttps://crm-web-whtas.vercel.app/cadastrar/${customerId}`;
          await sendWhatsAppMessage(from, welcomeText);
        }

        return res.status(200).json({ status: 'success' });
      } catch (error) {
        console.error('FIREBASE_OR_WHATSAPP_ERROR:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
