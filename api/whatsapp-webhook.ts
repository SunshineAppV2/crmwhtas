import { db } from '../src/lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

/**
 * WhatsApp Cloud API Webhook Handler (Vercel API Route)
 * This handles GET (Verification) and POST (Messages) from Meta.
 */
export default async function handler(req: any, res: any) {
  
  // 1. Webhook Verification (Meta GET request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Check if mode and token are correct (Token: 'crm_whats_secret')
    if (mode === 'subscribe' && token === 'crm_whats_secret') {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  // 2. Message Handling (Meta POST request)
  if (req.method === 'POST') {
    const body = req.body;

    // Check if it's a WhatsApp message update
    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from; // Phone number
      const text = messageObj.text?.body || '';

      if (!text) return res.status(200).send('No text');

      try {
        // --- 1. Find or Create Customer in Firestore ---
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('whatsapp_id', '==', from));
        const querySnapshot = await getDocs(q);

        let customerId = '';
        
        if (querySnapshot.empty) {
          // NEW CUSTOMER: Init "Primeiro Contato"
          const newCustomer = await addDoc(customersRef, {
            whatsapp_id: from,
            full_name: `WhatsApp User (${from})`,
            stage_id: '1', // Default to 'Primeiro Contato'
            ltv: 0,
            origin: 'WhatsApp',
            created_at: serverTimestamp()
          });
          customerId = newCustomer.id;
        } else {
          customerId = querySnapshot.docs[0].id;
        }

        // --- 2. Save Message to Timeline ---
        const interactionsRef = collection(db, 'interactions');
        await addDoc(interactionsRef, {
          customer_id: customerId,
          interaction_type: 'message',
          content: text,
          created_at: serverTimestamp()
        });

        // --- 3. Optional: Trigger Auto-reply or Notification ---
        console.log(`Mensagem de ${from}: ${text}`);

        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error('FIREBASE_ERROR:', error);
        return res.status(500).send('Error');
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
