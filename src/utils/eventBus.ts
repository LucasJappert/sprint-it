import type { Item } from "@/types";

class EventBus {
    private events: Record<string, Function[]> = {};

    on(event: string, callback: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event: string, callback: Function) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event: string, ...args: any[]) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(...args));
    }

    // Métodos específicos para eventos de la aplicación
    newTaskCreated(item: Item) {
        this.emit('taskCreated', item);
    }
}

export const eventBus = new EventBus();
