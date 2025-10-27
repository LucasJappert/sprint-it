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
    - Go to Project Settings → General → Your apps → Web app
    - Copy your Firebase configuration
    - Create a `.env` file based on `.env.example` and fill in your actual credentials

4. **Configuration Files:**

    - Copy `.env.example` to `.env` and fill in your Firebase web app credentials and Supabase settings
    - Copy `config.json.example` to `config.json` and fill in your Firebase service account credentials

    **Note**: `config.json` contains sensitive credentials and should never be committed to version control.

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

7. **Configure Environment Variables:**

    ```bash
    # Copy the template file
    cp .env.example .env

    # Edit .env with your actual Firebase and Supabase credentials
    # IMPORTANT: Never commit your .env file with real credentials!
    ```

8. **Start Development Server:**
    ```bash
    npm run dev
    ```

## 🔒 Security & Environment Setup

**⚠️ Important:** This project contains sensitive configuration data that should never be committed to version control.

### Required Files (Not Included in Repository):

-   **`.env`**: Your Firebase project credentials and Supabase settings

    -   Copy from `.env.example`
    -   Fill in your actual Firebase config values and Supabase settings
    -   **Never commit this file!**

-   **`config.json`**: Configuration file for Firebase service account
    -   Copy from `config.json.example`
    -   Fill in your actual Firebase service account credentials
    -   **Never commit this file!**
    -   **Security Note**: Contains sensitive credentials - keep it secure and never share

### Environment Variables:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Get Firebase values from:** Firebase Console → Project Settings → General → Your apps → Web app

**Get Supabase values from:** Supabase Dashboard → Settings → API

## Default User

After running the migration, you can log in with the default user credentials that will be created during the migration process. The migration script will display the login credentials once it completes successfully.

## User Management

### Creating Additional Users

To create additional users in the system:

1. **Create a temporary file**: Copy `create-user-template.js` and modify it with the new user's data
2. **Configure user**: Edit the `userConfig` section with:
    - `name`: User's first name
    - `lastName`: User's last name
    - `username`: Unique username
    - `email`: User's email
    - `password`: Password (will be encrypted automatically)
3. **Run script**: `node create-user-template.js`
4. **Delete file**: Remove the file after execution to avoid leaving traces in the repository

**Note**: Requires `config.json` in the project root.

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
