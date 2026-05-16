# Gunakan Node.js sebagai base
FROM node:18

# Install ffmpeg (penting buat konversi audio)
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Set working directory
WORKDIR /app

# Copy package.json dan install dependencies
COPY package.json ./
RUN npm install

# Copy semua file proyek
COPY . .

# Expose port (sesuai PORT environment variable)
EXPOSE 3000

# Jalankan server
CMD ["node", "api/index.js"]
