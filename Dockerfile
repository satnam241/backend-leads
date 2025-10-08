FROM node:18

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the app port (matches your .env PORT)
EXPOSE 4520

# Start the server
CMD ["npm", "run", "dev"]


