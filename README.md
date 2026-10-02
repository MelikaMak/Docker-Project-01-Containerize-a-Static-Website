# Project 01: Containerize a Static Website

In this project you put a small website (HTML, CSS, JS) inside a Docker container and open it in your browser.

Then you make it better: you change a file, refresh the browser, and see the change **without rebuilding anything**.

This is the "Hello World" of Docker. It looks simple, but the ideas here (images, containers, ports, volumes) come back in every later project. Take your time.

## What you will learn

- What an **image** and a **container** are
- How to write a basic `Dockerfile`
- What `FROM`, `COPY`, `EXPOSE`, `RUN`, `WORKDIR`, and `CMD` do
- How to open a container to your browser with **ports** (`-p 8080:80`)
- How to share a folder with a container using **volumes** (`-v`)

## What is in this folder

```
01-static-website/
├── README.md          <- this lesson
├── Dockerfile         <- version 1: Nginx
├── Dockerfile.live    <- version 2: http-server (Node.js)
├── .dockerignore      <- files Docker should never put into an image
└── site/              <- the website itself
    ├── index.html
    ├── style.css
    └── script.js
```

Open a terminal **in this folder** before you start:

```bash
cd 01-static-website
```

---

## Part 0: The big idea (read this first)

Two words you need to know:

- **Image**: a frozen package. It has an operating system, programs, and files inside. You make one with `docker build`. Think of it like a recipe or a template.
- **Container**: a running copy of an image. You start one with `docker run`. You can start many containers from the same image.

A container is like a small, separate computer:

- It has **its own files**. It cannot see the files on your computer.
- It has **its own network**. Your browser cannot reach it by default.

So we need two "bridges" between your computer and the container:

| Bridge | Flag | What it connects |
|--------|------|------------------|
| Port | `-p` | Your computer's network → the container's network |
| Volume | `-v` | A folder on your computer → a folder in the container |

Everything in this project is about these two bridges.

---

## Part 1: Look at the website

Open `site/index.html` in your editor. It is a normal web page with a CSS file and a JS file. Nothing special about Docker yet.

Notice that the website is in its own `site/` folder. This is on purpose. We only want the website files to end up in the web server, not the Dockerfile or this README. (You will see why in Exercise 5.)

---

## Part 2: The Nginx Dockerfile

[Nginx](https://nginx.org/) (say "engine-x") is a popular web server. Open `Dockerfile`:

```dockerfile
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
EXPOSE 80
```

Line by line:

**`FROM nginx:alpine`**
Start from an image that someone else already made, with Nginx installed. `alpine` is a very small Linux, so the image stays small. Every Dockerfile starts with `FROM`.

**`COPY site/ /usr/share/nginx/html/`**
Copy the files from `site/` on your computer into `/usr/share/nginx/html/` inside the image. That is the folder Nginx serves files from.
Important: this happens **when you build**. The files are saved inside the image, like a photo. If you change a file later, the image does not change.

**`EXPOSE 80`**
This is **only a note**. It tells people "this container listens on port 80". It does **not** open anything. Many beginners think it does. You open ports with `docker run -p`.

**Where is `CMD`?**
`CMD` is the command that runs when the container starts. The `nginx` image already has a `CMD` that starts Nginx, and our image takes it over automatically. You only write `CMD` when you want a different start command.

---

## Part 3: Build and run

### Build the image

```bash
docker build -t my-static-site .
```

- `docker build` makes an image from a Dockerfile.
- `-t my-static-site` gives the image a name (a "tag").
- The `.` at the end is the **build context**: the folder Docker is allowed to read from while building. `COPY site/` means "the `site` folder inside the build context".

**About `.dockerignore`:** this file works like `.gitignore`, but for `docker build`. Files listed in it are left out of the build context, so they can never end up in an image by accident. Open it and look: it lists the Dockerfiles, this README, and `.git`. (Hidden file: use `ls -a` to see it.)

Check that the image exists:

```bash
docker images
```

### Run a container

```bash
docker run -p 8080:80 my-static-site
```

`-p 8080:80` means **`YOUR_COMPUTER:CONTAINER`**:

```
Browser  →  localhost:8080  →  (Docker)  →  container port 80  →  Nginx
```

Open **http://localhost:8080** in your browser. You should see "Hello from a container!".

Press `Ctrl+C` in the terminal to stop it.

### Better ways to run

```bash
docker run -d --rm --name site -p 8080:80 my-static-site
```

| Flag | Meaning |
|------|---------|
| `-d` | "detached": run in the background, give me my terminal back |
| `--rm` | delete the container when it stops, so old containers don't pile up |
| `--name site` | give the container a name so you can talk to it |

Now you can use the name:

```bash
docker ps            # see running containers
docker logs site     # see what Nginx printed (every page visit is logged)
docker stop site     # stop it (and --rm deletes it)
```

### Try this: see the problem

1. Start the container again (the command above).
2. Change the text in `site/index.html` and save.
3. Refresh the browser.

**Nothing changes.** Why? Because `COPY` saved the files inside the image at build time. The container uses that saved copy, not your file.

To see your change, you would need to stop, rebuild, and run again:

```bash
docker stop site
docker build -t my-static-site .
docker run -d --rm --name site -p 8080:80 my-static-site
```

That works, but doing it after every small change is slow and annoying. Part 4 fixes this.

Stop the container before you continue:

```bash
docker stop site
```

---

## Part 4: Volumes, so you never rebuild

A **volume** (here: a "bind mount") shares a folder from your computer with the container. The container sees your **real, live files**, not a copy.

```bash
docker run -d --rm --name site -p 8080:80 -v "${PWD}/site":/usr/share/nginx/html:ro nginx:alpine
```

Look at the `-v` part: **`YOUR_FOLDER:CONTAINER_FOLDER`**

- `"${PWD}/site"`: the `site` folder on your computer. `${PWD}` means "the folder I am in now". Docker needs a full path here, and `${PWD}` gives it one.
- `/usr/share/nginx/html`: where it shows up inside the container.
- `:ro`: "read-only". Nginx only needs to read the files, so this is a safe habit.

Also notice: we did not use our own image. We used the plain `nginx:alpine` image, because the files now come from the volume.

Now try again:

1. Open http://localhost:8080
2. Change `site/index.html` and save.
3. Refresh the browser.

**The change shows up.** No rebuild.

### Important: a volume *covers* the folder

When you mount a folder, whatever was in that container folder before is **hidden** behind your folder. It is like putting a sheet of paper on top of another one.

So if you run *your own image* with `-v`, the files that `COPY` put in are hidden, and you see your live files instead.

This gives a simple rule:

| | Use it for | Files come from |
|---|---|---|
| `COPY` in Dockerfile | **Shipping** the finished site | Saved inside the image |
| `-v` with `docker run` | **Developing** (changing files often) | Your computer, live |

Stop the container:

```bash
docker stop site
```

---

## Part 5: The http-server version

Another way: use [http-server](https://www.npmjs.com/package/http-server), a small web server for Node.js. Open `Dockerfile.live`:

```dockerfile
FROM node:alpine
RUN npm install -g http-server
WORKDIR /app
COPY site/ /app/
EXPOSE 8080
CMD ["http-server", ".", "-p", "8080", "-c-1"]
```

New lines:

**`RUN npm install -g http-server`**
`RUN` runs a command **while building**. Here it installs http-server into the image.

**`WORKDIR /app`**
Like `cd /app`, but it stays for every line after it. If `/app` does not exist, Docker creates it.

**`CMD ["http-server", ".", "-p", "8080", "-c-1"]`**
The command that runs **every time a container starts**. It starts http-server in the current folder (`.`, which is `/app`) on port 8080. `-c-1` turns off caching, so your browser always gets the newest version of each file.

### `RUN` vs `CMD` (very important)

| | When does it run? | How often? |
|---|---|---|
| `RUN` | During `docker build` | Once, the result is saved in the image |
| `CMD` | During `docker run` | Every time a container starts |

If you remember one thing from this project, remember this table.

### Build and run it

This file is not called `Dockerfile`, so we tell Docker its name with `-f`:

```bash
docker build -f Dockerfile.live -t my-live-site .
docker run -d --rm --name live -p 8080:8080 -v "${PWD}/site":/app my-live-site
```

Notice the port is now **`8080:8080`**. http-server listens on 8080 inside the container, not 80 like Nginx. The right side of `-p` must always match what the program inside listens on.

Change a file, refresh the browser, and you see the change.

**A small but honest note:** this is not automatic "hot reload". The browser does not refresh by itself. You still press refresh. What you get is: no rebuilds, and no old cached files. The Nginx + volume way from Part 4 gives you the same result, without installing anything extra.

Stop it:

```bash
docker stop live
```

---

## Cheat sheet

```bash
# Images
docker build -t NAME .                  # build an image from ./Dockerfile
docker build -f FILE -t NAME .          # build from a different Dockerfile
docker images                           # list images
docker rmi NAME                         # delete an image

# Containers
docker run -d --rm --name N -p 8080:80 IMAGE   # run in background
docker ps                               # running containers
docker ps -a                            # all containers, also stopped ones
docker logs N                           # what the container printed
docker stop N                           # stop a container
docker exec -it N sh                    # open a shell INSIDE a container
```

---

## When something goes wrong

**"port is already allocated" or "address already in use"**
Something else is using port 8080, maybe an old container. Run `docker ps`, then `docker stop <name>`. Or just use another port: `-p 8081:80`.

**"Conflict. The container name "/site" is already in use"**
A container with that name still exists. Run `docker rm -f site` and try again.

**The page shows "403 Forbidden"**
Nginx found the folder but no `index.html` inside it. Your volume path is probably wrong. Check that you are in the `01-static-website` folder and that you wrote `${PWD}/site`, not just `${PWD}`.

**The page shows the old version**
Did you build with `COPY` and forget to rebuild? Or did you forget the `-v`? Also try a hard refresh: `Ctrl+Shift+R` (`Cmd+Shift+R` on Mac).

**"permission denied ... docker.sock" (Linux)**
Your user is not allowed to use Docker yet. See [Linux post-install steps](https://docs.docker.com/engine/install/linux-postinstall/).

**Windows `cmd`**
Replace `${PWD}` with `%cd%`. In PowerShell, `${PWD}` works as it is.

---

## Exercises

Try each one before you open the solution.

### 1. Change the port

Run the Nginx version so the site opens on **http://localhost:3000**.

<details>
<summary>Solution</summary>

Change the **left** number of `-p`. The left side is your computer, the right side is the container. Nginx inside still listens on 80.

```bash
docker run -d --rm --name site -p 3000:80 my-static-site
```

</details>

### 2. Two containers at the same time

Run two containers from the same image: one on port 8080 and one on 8081. Open both in the browser.

<details>
<summary>Solution</summary>

Each container needs its own name and its own port on your computer. Both can use port 80 inside, because each container has its own network.

```bash
docker run -d --rm --name site1 -p 8080:80 my-static-site
docker run -d --rm --name site2 -p 8081:80 my-static-site
docker ps
docker stop site1 site2
```

One image, many containers. This is the "template vs. copy" idea from Part 0.

</details>

### 3. Look inside a container

Start one container **without** a volume and one **with** a volume. Use `docker exec` to look at the files inside each. Then change `site/index.html` on your computer and look again.

<details>
<summary>Solution</summary>

```bash
docker run -d --rm --name baked -p 8080:80 my-static-site
docker run -d --rm --name live  -p 8081:80 -v "${PWD}/site":/usr/share/nginx/html:ro nginx:alpine

docker exec baked cat /usr/share/nginx/html/index.html
docker exec live  cat /usr/share/nginx/html/index.html
```

Now change `site/index.html` and run both `cat` commands again. Only `live` shows your change. `baked` still has the copy from build time.

You can also open a shell inside and walk around:

```bash
docker exec -it live sh
ls /usr/share/nginx/html
exit
```

```bash
docker stop baked live
```

</details>

### 4. Break it on purpose

Run the Nginx volume command, but mount `${PWD}` instead of `${PWD}/site`. What do you see in the browser? Why?

<details>
<summary>Solution</summary>

```bash
docker run -d --rm --name site -p 8080:80 -v "${PWD}":/usr/share/nginx/html:ro nginx:alpine
```

You get **403 Forbidden**. Nginx looks for `index.html` directly in `/usr/share/nginx/html`, but now that folder contains `Dockerfile`, `README.md`, and the `site/` folder. There is no `index.html` at the top.

Try http://localhost:8080/site/ and it works, because the file is one folder deeper.

Lesson: when something "doesn't work" with volumes, check **which folder** ended up **where**.

```bash
docker stop site
```

</details>

### 5. What does `.dockerignore` protect you from?

1. Change the `COPY` line in `Dockerfile` to `COPY . /usr/share/nginx/html/`. Rebuild, run, and open http://localhost:8080/Dockerfile.
2. Now rename `.dockerignore` to `dockerignore.off`. Rebuild, run, and open http://localhost:8080/Dockerfile again.

What is different, and why? (Undo both changes afterwards.)

<details>
<summary>Solution</summary>

```bash
docker build -t my-static-site .
docker run -d --rm --name site -p 8080:80 my-static-site
# open http://localhost:8080/Dockerfile
docker stop site
```

**Step 1:** you get **404 Not Found**. `COPY .` copies the whole build context, but `.dockerignore` already removed the Dockerfiles and README from it. They never reached the build.

**Step 2:** without `.dockerignore`, the same URL shows your Dockerfile, and http://localhost:8080/README.md shows this lesson, to anyone who visits. In real projects, files like that could be config files or passwords.

Two good habits protect you:

1. Copy only the folder you need (`COPY site/ ...`), not everything (`COPY .`).
2. Keep a `.dockerignore` as a safety net.

Also notice: in both steps the home page (`/`) shows 403. Same reason as Exercise 4: `index.html` is one folder deeper, in `site/`.

Undo the changes and rebuild:

```bash
mv dockerignore.off .dockerignore
# change the COPY line back to: COPY site/ /usr/share/nginx/html/
docker build -t my-static-site .
```

</details>

---

## Clean up

When you are done, remove what you made:

```bash
docker ps                                   # make sure nothing is still running
docker rmi my-static-site my-live-site      # delete the images
```

---

## What you know now

- An **image** is a template, a **container** is a running copy of it.
- `FROM` picks a starting image, `COPY` puts files in at build time, `RUN` runs commands at build time, `CMD` runs when the container starts, `EXPOSE` is only a note.
- `-p YOUR_COMPUTER:CONTAINER` opens a port to the container.
- `-v YOUR_FOLDER:CONTAINER_FOLDER` shares live files and covers what was there before.
- `COPY` is for shipping, `-v` is for developing.

Next: Project 02 (coming soon).
