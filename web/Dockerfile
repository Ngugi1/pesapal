FROM node:20-alpine AS dev
WORKDIR /app
ARG VITE_APP_BASE_PATH=/
ENV VITE_APP_BASE_PATH=$VITE_APP_BASE_PATH
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_APP_BASE_PATH=/
ARG VITE_APP_START_URL=/
ENV VITE_APP_BASE_PATH=$VITE_APP_BASE_PATH
ENV VITE_APP_START_URL=$VITE_APP_START_URL
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
