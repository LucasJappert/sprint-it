import type { Comment, Sprint } from "@/types";
import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, type DocumentData } from "firebase/firestore";
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
            fechaDesde: data.fechaDesde?.toDate() || new Date(),
            fechaHasta: data.fechaHasta?.toDate() || new Date(),
        } as Sprint;
    }
    return null;
};

export const subscribeToSprint = (sprintId: string, callback: (sprint: Sprint) => void) => {
    const docRef = doc(sprintsCollection, sprintId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            callback({
                ...data,
                fechaDesde: data.fechaDesde?.toDate() || new Date(),
                fechaHasta: data.fechaHasta?.toDate() || new Date(),
            } as Sprint);
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

export const getUsernameById = async (userId: string): Promise<string | null> => {
    const docRef = doc(usersCollection, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const userData = docSnap.data();
        return userData?.username || null;
    }

    return null;
};

export const getAllSprints = async (): Promise<Sprint[]> => {
    const querySnapshot = await getDocs(sprintsCollection);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            fechaDesde: data.fechaDesde?.toDate() || new Date(),
            fechaHasta: data.fechaHasta?.toDate() || new Date(),
        } as Sprint;
    });
};

export const addCommentToItem = async (sprintId: string, itemId: string, comment: Comment) => {
    const sprintRef = doc(sprintsCollection, sprintId);
    const commentData = {
        ...comment,
        createdAt: comment.createdAt, // Firestore handles Date serialization
    };

    await updateDoc(sprintRef, {
        [`items.${itemId}.comments`]: arrayUnion(commentData)
    });
};

export const addCommentToTask = async (sprintId: string, itemId: string, taskId: string, comment: Comment) => {
    const sprintRef = doc(sprintsCollection, sprintId);
    const commentData = {
        ...comment,
        createdAt: comment.createdAt, // Firestore handles Date serialization
    };

    await updateDoc(sprintRef, {
        [`items.${itemId}.tasks.${taskId}.comments`]: arrayUnion(commentData)
    });
};

export const addCommentToItemOrTask = async (sprintId: string, itemId: string, taskId: string | null, comment: Comment) => {
    const sprintRef = doc(sprintsCollection, sprintId);
    const commentData = {
        ...comment,
        createdAt: comment.createdAt, // Firestore handles Date serialization
    };

    const fieldPath = taskId
        ? `items.${itemId}.tasks.${taskId}.comments`
        : `items.${itemId}.comments`;

    // Use setDoc with merge: true to only update the comments field without overwriting the entire document
    try {
        await setDoc(sprintRef, {
            [fieldPath]: arrayUnion(commentData)
        }, { merge: true });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};
