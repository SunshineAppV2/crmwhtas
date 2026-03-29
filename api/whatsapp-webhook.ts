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

async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('MISSING_WHATSAPP_CREDENTIALS');
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
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
    const result = await response.json();
    console.log('WHATSAPP_SEND_RESULT:', result);
  } catch (err) {
    console.error('ERROR_SENDING_WHATSAPP:', err);
  }
}

export default async function handler(req: any, res: any) {
  const VERIFY_TOKEN = "Ascg@232430";

  console.log(`REQUEST_METHOD: ${req.method} | TIMESTAMP: ${new Date().toISOString()}`);

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED_SUCCESSFULLY');
      return res.status(200).send(challenge);
    } else {
      console.error('WEBHOOK_VERIFICATION_FAILED: TOKEN_MISMATCH');
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    const body = req.body;
    console.log('WEBHOOK_POST_BODY:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from;
      const text = messageObj.text?.body || '';

      console.log(`INCOMING_MESSAGE from: ${from} | Text: ${text}`);

      if (!text) {
        console.log('MESSAGE_WITHOUT_TEXT_BODY');
        return res.status(200).send('No text');
      }

      try {
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('whatsapp_id', '==', from));
        const querySnapshot = await getDocs(q);

        let customerId = '';
        let isNew = false;
        
        if (querySnapshot.empty) {
          isNew = true;
          console.log(`CREATING_NEW_CUSTOMER for: ${from}`);
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
          console.log(`EXISTING_CUSTOMER_FOUND: ${customerId}`);
        }

        console.log(`RECORDING_INTERACTION for Customer: ${customerId}`);
        await addDoc(collection(db, 'interactions'), {
          customer_id: customerId,
          interaction_type: 'message',
          content: text,
          created_at: serverTimestamp()
        });

        if (isNew) {
          const welcomeText = `Olá! Seja bem-vindo ao nosso atendimento. 🚀\nPara agilizar o seu processo, por favor complete o seu cadastro no link abaixo:\n\nhttps://crm-web-whtas.vercel.app/cadastrar/${customerId}`;
          console.log(`SENDING_WELCOME_MESSAGE to: ${from}`);
          await sendWhatsAppMessage(from, welcomeText);
        }

        return res.status(200).json({ status: 'success' });
      } catch (error: any) {
        console.error('FIREBASE_OR_WHATSAPP_CRITICAL_ERROR:', error?.message || error);
        return res.status(500).json({ error: 'Internal Server Error', details: error?.message });
      }
    }
    console.log('NON_MESSAGE_EVENT_RECEIVED');
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
