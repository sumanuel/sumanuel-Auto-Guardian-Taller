import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase/config";

const MAIL_COLLECTION = "mail";

export async function queueMailMessage({ to, subject, text, html }) {
  const collectionRef = collection(firestore, MAIL_COLLECTION);

  return addDoc(collectionRef, {
    to,
    message: {
      subject,
      text,
      html,
    },
    meta: {
      source: "auto-guardian-taller",
      queuedAt: serverTimestamp(),
    },
  });
}
