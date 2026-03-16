# Server Hardening Guide

This project already has app-level security in Express. Use this guide for the infrastructure layer before production deployment.

## 1. Nginx rate limiting

The default `nginx/nginx.conf` now includes:

- tighter limits for `/api/auth/`
- general per-IP rate limiting for `/api/`
- per-IP connection limits for `/api/`, `/uploads/`, and `/socket.io/`

This helps absorb abuse before requests reach Node.js.

## 2. HTTPS

The file `nginx/nginx.https.example.conf` is a ready-to-adapt example for the real server.

What you need on the actual server:

1. Point the real domain to the server.
2. Install Certbot.
3. Issue a certificate for the real domain.
4. Replace the placeholder domain in `nginx.https.example.conf`.
5. Mount or copy the real certificates into the Nginx container or use a host-level reverse proxy.

Example commands on Ubuntu:

```bash
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.kmutnb.ac.th
```

## 3. Firewall

Recommended `ufw` baseline:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not expose MongoDB directly to the internet.

## 4. Optional free upgrade: Cloudflare

For a public-facing department site, Cloudflare Free is usually enough as an extra outer layer.

Suggested setup:

- put the domain behind Cloudflare
- keep Nginx rate limits enabled
- use HTTPS end-to-end if possible

## 5. What is still done outside the repo

These are not code changes inside the project:

- opening firewall ports
- issuing TLS certificates
- configuring DNS
- enabling Cloudflare
- setting automatic certificate renewal
