# Production Deployment Checklist

Use this checklist before deploying to the department server.

## 1. Prepare files on the server

- Clone the repository to the server.
- Copy `client/.env.production.example` to `client/.env` and fill in real Firebase values.
- Copy `server/.env.production.example` to `server/.env` and fill in real production values.
- Put the Firebase service account key at `server/config/serviceAccountKey.json`.
- If you already have uploaded room images, copy them into `server/uploads/`.

## 2. Verify required production values

- `server/.env` must contain a real `CLIENT_URL` such as `https://your-domain.kmutnb.ac.th`.
- `server/.env` must contain `MONGO_URI`, `ADMIN_PIN`, `EMAIL_USER`, and `EMAIL_PASS`.
- `client/.env` must contain all `VITE_FIREBASE_*` values.
- The Firebase project must allow the production domain in Google sign-in authorized domains.

## 3. Start the stack

Run from the project root:

```bash
docker compose up -d --build
```

## 4. Smoke test after deploy

- Open the real production URL.
- Login with Google.
- Create a booking.
- Approve or reject a booking as admin.
- Upload or view room images.
- Test Excel/PDF export from Dashboard.

## 5. If the server fails to start

Check these first:

- `CLIENT_URL` points to the real domain, not `localhost`.
- `server/config/serviceAccountKey.json` exists inside the deployment.
- Port `80` is open and not blocked by another service.
- Nginx reverse proxy is reachable.
- Docker containers are healthy:

```bash
docker compose ps
docker compose logs server
docker compose logs nginx
```
