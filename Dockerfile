FROM imbios/bun-node

# Set the working directory

WORKDIR /app

# Copy the current directory contents into the container at /app

COPY . /app

RUN bun install

RUN bun run build

# expose port 80 for not socket mode
EXPOSE 80



CMD ["bun", "start"]