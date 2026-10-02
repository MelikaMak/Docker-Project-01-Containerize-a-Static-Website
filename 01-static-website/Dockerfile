# Start from an image that already has Nginx installed.
# "alpine" is a very small Linux, so the image stays small.
FROM nginx:alpine

# Copy our website into the folder Nginx serves files from.
# This happens at BUILD time: the files are saved inside the image.
COPY site/ /usr/share/nginx/html/

# Documentation only: "this container listens on port 80".
# It does NOT open the port. You do that with "docker run -p".
EXPOSE 80

# No CMD here: the nginx image already has one that starts Nginx.
