import type { Sprint } from "@/types";
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";

const sprintsCollection = collection(db, "sprints");
const usersCollection = collection(db, "users");

export const saveSprint = async (sprint: Sprint) => {
    const docRef = doc(sprintsCollection, sprint.id);
    await setDoc(docRef, sprint as DocumentData);
};

export const getSprint = async (sprintId: string): Promise<Sprint | null> => {
    const docRef = doc(sprintsCollection, sprintId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            ...data,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
        } as Sprint;
    }
    return null;
};

export const subscribeToSprint = (sprintId: string, callback: (sprint: Sprint) => void) => {
    const docRef = doc(sprintsCollection, sprintId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as Sprint);
        }
    });
};

export const saveUser = async (user: any) => {
    const docRef = doc(usersCollection, user.uid);
    await setDoc(docRef, user);
};

export const getUser = async (userId: string) => {
    const docRef = doc(usersCollection, userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

export const getUserByUsername = async (username: string) => {
    const q = query(usersCollection, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        if (docSnap) {
            return { id: docSnap.id, ...docSnap.data() };
        }
    }
    return null;
};

export const validateUsernames = async (usernames: string[]): Promise<{ valid: string[], invalid: string[]; }> => {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const username of usernames) {
        const user = await getUserByUsername(username);
        if (user) {
            valid.push(username);
        } else {
            invalid.push(username);
        }
    }

    return { valid, invalid };
};
