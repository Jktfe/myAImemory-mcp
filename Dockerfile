FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Expose port for HTTP server (if needed)
EXPOSE 3000

# Set the command to run the MCP server
CMD ["node", "dist/direct-index.js"]
