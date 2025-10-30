// Lista de miembros del equipo para asignación de items en sprints
// Estos usernames deben existir en la colección 'users' de Firestore
export const SPRINT_TEAM_MEMBERS = ['ljappert', 'srotschy'] as const;

export type SprintTeamMember = typeof SPRINT_TEAM_MEMBERS[number];
