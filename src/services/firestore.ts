import { STATE_VALUES } from "@/constants/states";
import type { ChangeHistory, Comment, Sprint, User } from "@/types";
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";

// Global cache for user display names to avoid multiple Firestore calls
const userDisplayNameCache = new Map<string, string>();

const sprintsCollection = collection(db, "sprints");
const usersCollection = collection(db, "users");
const commentsCollection = collection(db, "comments");
const changesCollection = collection(db, "changes");
const backupsCollection = collection(db, "backups");

/**
 * Get user display name from cache or Firestore (async, private)
 */
const _getUserDisplayName = async (userId: string): Promise<string> => {
    if (userDisplayNameCache.has(userId)) {
        return userDisplayNameCache.get(userId)!;
    }

    try {
        const user = await getUser(userId);
        if (user && (user as any).name && (user as any).lastName) {
            const displayName = `${(user as any).name} ${(user as any).lastName}`;
            userDisplayNameCache.set(userId, displayName);
            return displayName;
        }
    } catch (error) {
        console.warn(`Error getting user display name for ${userId}:`, error);
    }

    return userId; // Fallback to ID if name cannot be obtained
};

/**
 * Get user display name (async)
 * Returns first name only for brevity in UI
 * If not in cache, fetches from Firestore and caches it
 */
export const getUserDisplayNameAsync = async (userId: string): Promise<string> => {
    if (!userDisplayNameCache.has(userId)) {
        // If not in cache, fetch it
        await _getUserDisplayName(userId);
    }
    const fullName = userDisplayNameCache.get(userId) || userId;
    console.log(`Got user display name for ${userId}:`, fullName);
    return fullName.split(" ")[0].replace("Sebastian", "Seba"); // Return first name only
};

/**
 * Convierte un timestamp de Firestore a un objeto Date de JavaScript
 * Maneja tanto objetos Date nativos como timestamps de Firestore
 */
export const convertFirestoreTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();

    // Si ya es un objeto Date nativo, devolverlo tal como está
    if (timestamp instanceof Date) {
        return timestamp;
    }

    // Si es un timestamp de Firestore con método toDate()
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
        return timestamp.toDate();
    }

    // Si es un objeto con seconds (formato timestamp de Firestore)
    if (timestamp.seconds && typeof timestamp.seconds === "number") {
        return new Date(timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1000000));
    }

    // Si es un string, intentar convertirlo a Date
    if (typeof timestamp === "string") {
        return new Date(timestamp);
    }

    // Último recurso: devolver nueva fecha
    return new Date();
};

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

export const addComment = async (comment: Omit<Comment, "id">): Promise<string> => {
    const commentData = {
        ...comment,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
    };
    const docRef = await addDoc(commentsCollection, commentData);
    return docRef.id;
};

export const getCommentsByAssociatedId = async (associatedId: string): Promise<Comment[]> => {
    const q = query(commentsCollection, where("associatedId", "==", associatedId));
    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Comment[];

    // Ordenar por createdAt en el cliente para evitar necesidad de índice compuesto
    return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

export const updateComment = async (commentId: string, updates: Partial<Pick<Comment, "description" | "updatedAt">>) => {
    const docRef = doc(commentsCollection, commentId);
    await updateDoc(docRef, updates);
};

export const deleteComment = async (commentId: string) => {
    const docRef = doc(commentsCollection, commentId);
    await deleteDoc(docRef);
};

export const getAllUsers = async (): Promise<User[]> => {
    const querySnapshot = await getDocs(usersCollection);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as User[];
};

export const addChange = async (change: Omit<ChangeHistory, "id">): Promise<string> => {
    const changeData = {
        ...change,
        createdAt: change.createdAt,
    };
    const docRef = await addDoc(changesCollection, changeData);
    return docRef.id;
};

export const getChangesByAssociatedId = async (associatedId: string): Promise<ChangeHistory[]> => {
    const q = query(changesCollection, where("associatedId", "==", associatedId));
    const querySnapshot = await getDocs(q);
    const changes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ChangeHistory[];

    // Ordenar por createdAt descendente (más recientes primero)
    return changes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const exportAllData = async () => {
    const [sprintsSnapshot, usersSnapshot, commentsSnapshot, changesSnapshot] = await Promise.all([
        getDocs(sprintsCollection),
        getDocs(usersCollection),
        getDocs(commentsCollection),
        getDocs(changesCollection),
    ]);

    const sprints = sprintsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaDesde: doc.data().fechaDesde?.toDate() || new Date(),
        fechaHasta: doc.data().fechaHasta?.toDate() || new Date(),
    }));

    const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    const changes = changesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));

    return {
        sprints,
        users,
        comments,
        changes,
        exportedAt: new Date().toISOString(),
    };
};

export const updateLastBackupDate = async (userId: string) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    const backupDocRef = doc(backupsCollection, userId);
    await setDoc(backupDocRef, {
        userId,
        lastBackupDate: today,
        updatedAt: now,
    });
};

export const getLastBackupDate = async (userId: string): Promise<string | null> => {
    const backupDocRef = doc(backupsCollection, userId);
    const docSnap = await getDoc(backupDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return data.lastBackupDate || null;
    }

    return null;
};

/**
 * Obtiene los datos filtrados del sprint para exportar (items con tasks Done + solo tasks Done)
 * Esta función puede usarse tanto para obtener info previa como para la exportación real
 */
export const getFilteredSprintData = async (sprintId: string) => {
    const sprint = await getSprint(sprintId);
    if (!sprint) {
        throw new Error("Sprint no encontrado");
    }

    // Filtrar items activos (no eliminados) que tienen al menos una task en estado Done
    const itemsWithDoneTasks = (sprint.items || []).filter((item) => {
        if (item.deletedAt !== null) return false;
        const activeTasks = item.tasks.filter((task) => task.deletedAt === null);
        const hasDoneTask = activeTasks.some((task) => task.state === STATE_VALUES.DONE);
        return hasDoneTask;
    });

    // Filtrar solo las tasks completas (Done) en cada item
    const itemsWithDoneTasksOnly = itemsWithDoneTasks.map((item) => {
        const doneTasks = item.tasks.filter((task) => task.deletedAt === null && task.state === STATE_VALUES.DONE);
        return {
            ...item,
            tasks: doneTasks,
        };
    });

    return { sprint, itemsWithDoneTasksOnly };
};

/**
 * Exporta los datos del sprint actual sin items ni tareas eliminadas
 * Solo exporta items que tienen al menos una task completa (Done)
 * Las tasks exportadas serán solo las completas (Done)
 * Incluye los comentarios asociados a items y tasks activos
 */
export const exportSprintData = async (sprintId: string) => {
    // Obtener el sprint
    const sprint = await getSprint(sprintId);
    if (!sprint) {
        throw new Error("Sprint no encontrado");
    }

    // Obtener datos filtrados
    const { itemsWithDoneTasksOnly } = await getFilteredSprintData(sprintId);

    // Obtener todos los IDs de items y tasks para buscar comentarios
    const itemIds = itemsWithDoneTasksOnly.map((item) => item.id);
    const taskIds: string[] = [];
    itemsWithDoneTasksOnly.forEach((item) => {
        item.tasks.forEach((task) => taskIds.push(task.id));
    });

    // Obtener comentarios para los items y tasks
    let comments: Comment[] = [];
    if (itemIds.length > 0 || taskIds.length > 0) {
        const allComments = await getDocs(commentsCollection);
        comments = allComments.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    associatedId: data.associatedId || "",
                    associatedType: data.associatedType || "item",
                    userId: data.userId || "",
                    description: data.description || "",
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                } as Comment;
            })
            .filter((comment) => {
                if (comment.associatedType === "item") {
                    return itemIds.includes(comment.associatedId);
                }
                if (comment.associatedType === "task") {
                    return taskIds.includes(comment.associatedId);
                }
                return false;
            });
    }

    // Prompt para ChatGPT
    const prompt = `Generame un resumen del sprint MUY breve (maximo 10-12 lineas por seccion), en formato ideal para WhatsApp. 

Formato requerido:
- Organizar por secciones segun el projectName (ej: 🟢 APIX, 🔵 Agroideas-In, 🟠 Tracker, 📋 Dashboard, 🟣 Meetings).
- Cada seccion debe tener bullets cortos con las acciones mas importantes. Entre parentesis, al principio y para cada proyecto, indicar el porcentaje de esfuerzo y horas, por ej: "📋 Dashboard Sprint-It: 45.2% (24h)"
- Priorizar impacto funcional y de negocio por sobre detalles tecnicos.
- Redactar para colegas que no son del area de sistemas (claro, directo y simple).
- Usar pocos emoticones solo para ayudar a la lectura (sin abusar).
- Si hay tareas en estado Done con esfuerzo 0, considerarlas como mejoras realizadas fuera de horario y mencionarlas como aportes de valor cuando corresponda.
- Agrupar y sintetizar tareas similares en un mismo bullet para evitar exceso de detalle.
- Evitar lenguaje tecnico innecesario.`;

    // Construir el objeto de exportación
    const exportData = {
        prompt,
        sprint: {
            ...sprint,
            items: itemsWithDoneTasksOnly,
        },
        comments,
        exportedAt: new Date().toISOString(),
    };

    return exportData;
};;
