## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   PHP >= 8.2
-   Composer
-   Node.js & NPM or Yarn
-   MySQL

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/abhipraya-kusuma-dev/seragam-app-v2
    cd seragam-app-v2
    ```

2.  **Install PHP dependencies:**
    ```bash
    composer install
    ```

3.  **Install JavaScript dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Set up your environment file:**
    -   Copy the `.env.example` file to `.env`.
        ```bash
        cp .env.example .env
        ```
    -   Your `.env` file should be populated with the correct credentials. Key settings from your configuration include:
        ```ini
        APP_NAME="Seragam App"
        APP_URL=http://localhost

        DB_CONNECTION=mysql
        DB_HOST=127.0.0.1
        DB_PORT=3306
        DB_DATABASE=order_app
        DB_USERNAME=root
        DB_PASSWORD=

        SESSION_DRIVER=database
        QUEUE_CONNECTION=database
        CACHE_STORE=database
        ```
    -   Generate a new application key:
        ```bash
        php artisan key:generate
        ```

5.  **Run database migrations:**
    This will set up the necessary tables for the application, including for sessions, jobs, and cache.
    ```bash
    php artisan migrate
    ```
    (use --seed to seed admin account)

6.  **Compile front-end assets:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

---

##  WebSocket with Laravel Reverb

This application uses Laravel Reverb, a first-party WebSocket server for Laravel, to handle real-time communication.

### Configuration

Your `.env` file should be configured with the following settings for Reverb to work correctly. These variables connect your Laravel backend and your Inertia.js frontend to the Reverb server.

- Option 1:
Use the Artisan Command (Recommended): The easiest and most secure way to get new credentials is to run the install command again. This will generate a new set of secure, random values for you.
```bash
php artisan reverb:install
```

- Option 2
Update your `.env` file with your manual value:

```ini
BROADCAST_CONNECTION=reverb

# -----------------------------
# Reverb Server Configuration
# -----------------------------
REVERB_APP_ID=974811
REVERB_APP_KEY=appKeyTralala
REVERB_APP_SECRET=yourSecret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

# -----------------------------
# Reverb Client (Vite) Configuration
# -----------------------------
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```


## Start The Application

Start the development server:

```bash
php artisan serve
```

Start the front-end asset compiler:
```bash
npm run dev
```

Ensure the Reverb server is running in a separate terminal:
```bash
php artisan reverb:start
```
(use --debug for better dev experience)

Track the queue of the reverb (Optional):
```bash
php artisan queue:work
```

Access the application in your browser, typically at http://localhost:8000 (or the URL from php artisan serve).
