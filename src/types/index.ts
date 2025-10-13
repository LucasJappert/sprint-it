export interface User {
    id: string;
    name: string;
    lastName: string;
    username: string;
    email: string;
    password: string; // hashed password
}

export type AccentColor = "primary" | "blue" | "gray" | "green" | "light-green" | "light-yellow";

export interface Task {
    id: string;
    title: string;
    detail: string;
    priority: "low" | "medium" | "high";
    estimatedEffort: number;
    actualEffort: number;
    assignedUser: string | null; // user id (nullable)
}

export interface Item {
    id: string;
    title: string;
    detail: string;
    priority: "low" | "medium" | "high";
    estimatedEffort: number;
    actualEffort: number;
    assignedUser: string | null; // user id (nullable)
    tasks: Task[];
    order: number;
}

export interface Sprint {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    items: Item[];
}
