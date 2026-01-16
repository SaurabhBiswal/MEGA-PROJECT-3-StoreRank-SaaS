# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ && \
    npm install --legacy-peer-deps && \
    apk del python3 make g++

# Copy application source code
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
