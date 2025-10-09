# Sprint It

A Vue 3 application for managing sprints, items, and tasks with custom authentication and Firestore.

## Features

-   Custom user authentication with encrypted passwords
-   Sprint management (past and future sprints)
-   Drag-and-drop items and tasks
-   Real-time data synchronization with Firestore
-   Responsive UI with Vuetify

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Install Firebase CLI (if not already installed):**

    ```bash
    npm install -g firebase-tools
    firebase login
    firebase use sprint-it-f7a5b
    ```

3. **Firebase Setup:**

    - Create a Firebase project at https://console.firebase.google.com/
    - Enable Firestore Database (Authentication is not needed - we use custom auth)
    - Update `.env` with your Firebase config

4. **Service Account Key:**

    - Go to Firebase Console → Project Settings → Service Accounts
    - Generate a new private key
    - Download the JSON file and rename it to `serviceAccountKey.json`
    - Place it in the project root

5. **Deploy Firestore Rules:**

    ```bash
    firebase deploy --only firestore:rules
    ```

    This sets up the database permissions for the application.

6. **Run Migration:**

    ```bash
    npm run migrate
    ```

    This will create the default user and initial sprints.

    **Note:** The migration creates users in Firestore with encrypted passwords. No Firebase Authentication setup is required.

7. **Start Development Server:**
    ```bash
    npm run dev
    ```

## Default User

After running the migration, you can log in with the default user credentials that will be created during the migration process. The migration script will display the login credentials once it completes successfully.

## Scripts

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run preview` - Preview production build
-   `npm run migrate` - Run database migrations
-   `npm run lint` - Lint code
-   `npm run typecheck` - Type check

## Tech Stack

-   Vue 3 + TypeScript
-   Vite
-   Vuetify
-   Firebase (Auth + Firestore)
-   Pinia
-   Vue Router
-   Vue Draggable Next
