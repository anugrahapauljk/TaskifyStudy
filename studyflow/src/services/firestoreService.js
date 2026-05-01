import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function chatRef(userId, chatId) {
  return doc(db, "users", userId, "chats", chatId);
}

function chatsCollection(userId) {
  return collection(db, "users", userId, "chats");
}

export async function createChat(userId, data) {
  const docRef = await addDoc(chatsCollection(userId), {
    ...data,
    createdAt: serverTimestamp(),
    status: "in_progress",
    currentTopicIndex: 0,
    results: [],
  });
  return docRef.id;
}

export async function updateChat(userId, chatId, data) {
  const ref = chatRef(userId, chatId);
  await updateDoc(ref, data);
}

export async function getChat(userId, chatId) {
  const ref = chatRef(userId, chatId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getUserChats(userId) {
  const q = query(chatsCollection(userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteChat(userId, chatId) {
  const ref = chatRef(userId, chatId);
  await deleteDoc(ref);
}
