FROM node:22-slim AS frontend-build
WORKDIR /frontend
# Vendor .npmrc sets legacy-peer-deps=true, required because
# react-helmet-async 2.0.5 only declares React 16, 17, and 18 peers,
# while this app uses React 19. Without it, npm ci fails with ERESOLVE.
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend-build /frontend/dist ./frontend/dist
# Runtime data dir for a token saved in Settings. It lives on the
# running container only, no persistent volume is attached yet,
# so a redeploy that replaces the container loses a Settings token.
RUN mkdir -p /app/data && chmod 700 /app/data
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
