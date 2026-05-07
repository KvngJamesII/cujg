# Redon3 Platform Overview

The Redon3 platform is a robust panel hosting service designed for developers to deploy and manage Node.js and Python scripts or "panels" with ease. It provides a full-stack solution including a modern frontend, a scalable backend, and containerized execution environments for user applications.

## Key Features & Architecture

### Frontend
- **Technology Stack**: Built with React and TypeScript, using Vite as the build tool.
- **User Interface**: Provides a responsive and intuitive dashboard for managing panels, viewing logs, checking stats, handling billing, and accessing administrative features.
- **Real-time Updates**: Connects to the backend via WebSockets for live log streaming and interactive console input.

### Backend
- **Technology Stack**: Node.js with Express framework, written in TypeScript.
- **API**: Serves RESTful APIs for all frontend interactions (authentication, panel management, billing, etc.).
- **Database Interaction**: Uses PostgreSQL as the primary data store, with Drizzle ORM for type-safe database queries.
- **Container Orchestration**: Manages Node.js and Python panel execution using Docker. Each user panel runs in its own isolated Docker container.
- **Billing & Payments**: Integrates with Paystack for payment processing and manages coupons/subscriptions.
- **Authentication**: Handles user registration, login, JWT token management, and 2FA.

### Database
- **Type**: PostgreSQL
- **Schema**: Stores user data, panel configurations, subscription details, payment history, admin settings, and more.

### Containerization (Docker)
- User-deployed Node.js and Python panels are run within dedicated Docker containers.
- The backend interacts with the Docker daemon to:
    - Create and start new containers for panels.
    - Stop, restart, and delete containers.
    - Stream live logs from containers via WebSockets.
    - Provide interactive shell access (stdin/stdout) to running containers.
    - Monitor real-time resource usage (CPU, RAM, Storage, Uptime) of containers.

### Real-time Communication (WebSockets)
- Utilized for live log streaming from user panels to the frontend console.
- Enables interactive console input (stdin) for running scripts.

## Platform Setup & Development

### Prerequisites
Before setting up the Redon3 platform, ensure you have the following installed:
-   **Node.js**: (LTS version recommended)
-   **pnpm**: A fast, disk space efficient package manager (e.g., `npm install -g pnpm`)
-   **Docker**: For running user panels.
-   **PostgreSQL**: A running PostgreSQL server (local or remote).

### Directory Structure
The core application is organized into `frontend` and `backend` directories at the root of the workspace. Shared code (like Drizzle ORM schemas) resides in the `lib` directory.

```
redon3-workspace/
├── backend/            # Node.js/Express API, Docker integration, Auth, Billing
├── frontend/           # React/Vite UI, User Dashboard, Admin Panels
├── lib/                # Shared TypeScript libraries (DB schemas, API types)
├── pnpm-workspace.yaml # pnpm workspace configuration
├── package.json        # Root package for workspace scripts
└── tsconfig.base.json  # Base TypeScript configuration
```

### Environment Variables

Both the `frontend` and `backend` services require `.env` files for configuration.

#### `redon3-workspace/backend/.env`
```dotenv
PORT=3001
DATABASE_URL="postgresql://redon3:redon3secure2026@localhost:5432/redon3"
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
DOCKER_ENABLED=true # Set to true to enable Docker container management
PAYSTACK_SECRET_KEY=your_paystack_secret_key # For production payment processing
```
*Note: Replace placeholder secrets with strong, unique values.*

#### `redon3-workspace/frontend/.env` (Not typically needed for development as Vite handles some via `vite.config.ts`)
The frontend's `vite.config.ts` handles the `BASE_PATH` and proxy configuration for `/api` to the backend. `PORT` is usually set directly in the `pnpm dev` command.

### Installation

1.  **Navigate to the workspace root:**
    ```bash
    cd redon3-workspace
    ```
2.  **Install pnpm dependencies for all projects:**
    ```bash
    pnpm install
    ```
3.  **Setup PostgreSQL Database:**
    *   Ensure your PostgreSQL server is running.
    *   Create a database (e.g., `redon3`) and a user (e.g., `redon3` with password `redon3secure2026`).
    *   The `DATABASE_URL` in `backend/.env` should match your database connection string.
    *   Run Drizzle migrations (this would typically involve a separate script, assuming it's part of your `backend`'s `pnpm build` or `pnpm start` or a dedicated migration command). For now, ensure the `plans` table has at least 'basic' and 'pro' entries. If not, you can insert them manually:
        ```bash
        psql "postgresql://redon3:redon3secure2026@localhost:5432/redon3" -c "
        INSERT INTO plans (id, name, price_kobo, bot_limit, ram_per_bot_mb, cpu_per_bot, storage_gb, features)
        VALUES
        ('basic', 'Basic', 140000, 1, 450, 0.3, 1, '{}'),
        ('pro', 'Pro', 299900, 3, 1024, 0.6, 3, '{}')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price_kobo = EXCLUDED.price_kobo,
          bot_limit = EXCLUDED.bot_limit,
          ram_per_bot_mb = EXCLUDED.ram_per_bot_mb,
          cpu_per_bot = EXCLUDED.cpu_per_bot,
          storage_gb = EXCLUDED.storage_gb;
        "
        ```

### Running the Platform

1.  **Start the Backend Service:**
    ```bash
    cd redon3-workspace/backend
    PORT=3001 DATABASE_URL="postgresql://redon3:redon3secure2026@localhost:5432/redon3" JWT_SECRET="your_jwt_secret_key_here" JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here" pnpm start
    ```
    *(Ensure all required backend environment variables are set either directly or via a `.env` file loaded by `pnpm start` if configured.)*

2.  **Start the Frontend Development Server:**
    ```bash
    cd redon3-workspace/frontend
    PORT=3000 BASE_PATH=/ pnpm dev
    ```

After both services are running, the frontend should be accessible in your browser at `http://localhost:3000`.

## Administrative Features
The platform includes an admin section (accessible to users with `admin` role) for managing:
-   Users (suspension, banning, plan extension)
-   Panels (force stop/restart)
-   Plans (pricing, specs - accessible via `/admin/plans`)
-   Coupons and Trial Codes
-   Payments and Audit Logs
-   Broadcast messages.
