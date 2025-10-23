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
    readonly id: string;
    readonly content: string;
    readonly author: string; // user id
    readonly createdAt: Date;
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
    comments: Comment[];
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
    comments: Comment[];
}

export interface Sprint {
    id: string;
    titulo: string;
    fechaDesde: Date;
    fechaHasta: Date;
    diasHabiles: number;
    items: Item[];
}
