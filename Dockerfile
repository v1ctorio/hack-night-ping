FROM imbios/bun-node

# Set the working directory

WORKDIR /app

# Copy the current directory contents into the container at /app

COPY . /app

RUN bun install

# expose port 80 for not socket mode
EXPOSE 80

