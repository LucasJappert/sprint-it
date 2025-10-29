import type { PriorityValue } from "@/constants/priorities";
import type { StateValue } from "@/constants/states";

export interface User {
    id: string;
    name: string;
    lastName: string;
    username: string;
    email: string;
    password: string; // hashed password
}

export type AccentColor = "primary" | "blue" | "gray" | "green" | "light-green" | "light-yellow";

export interface Comment {
    id: string;
    associatedId: string; // id of the task or item
    associatedType: "task" | "item";
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
}

export interface Task {
    id: string;
    title: string;
    detail: string;
    priority: PriorityValue;
    state: StateValue;
    estimatedEffort: number;
    actualEffort: number;
    assignedUser: string | null; // user id (nullable)
    order: number;
    createdAt: Date;
}

export interface Item {
    id: string;
    title: string;
    detail: string;
    priority: PriorityValue;
    state: StateValue;
    estimatedEffort: number;
    actualEffort: number;
    assignedUser: string | null; // user id (nullable)
    tasks: Task[];
    order: number;
    createdAt: Date;
}

export interface Sprint {
    id: string;
    titulo: string;
    fechaDesde: Date;
    fechaHasta: Date;
    diasHabiles: number;
    items: Item[];
}

export interface ChangeHistory {
    id: string;
    associatedId: string; // id of the task or item
    associatedType: "task" | "item";
    field: string; // e.g., "title", "detail", "priority", etc.
    oldValue: string;
    newValue: string;
    userId: string; // user who made the change
    createdAt: Date;
}
