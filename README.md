
# Notes'n'Todos

Selfhosted web application for editing notes and managing todos with markdown syntax.

Try it in the [playground](https://lpss.dk/nnt-playground)!

## Features

- Notes are written with markdown syntax
- Notes are shown sorted by date 
- Todo items are declared in the markdown with github task list syntax: `- [ ]`
- Tags system for filtering notes
- Multiple note books 
- The notes 

## How to compile and run locally

Install dependencies

```text
sudo apt install python3.9-venv python3.9-dev 
```

Pull the repository

```text
git clone https://github.com/larspontoppidan/notesntodos
cd notesntodos
```

Install and build release

```text
npm install
npm run build
npm run serve
```

If `npm` is not installed, consider following installation instructions such as these: https://github.com/nodesource/distributions and the suggestions here: https://stackoverflow.com/a/55274930 - to avoid version and permission issues.


### Hints for using vscode + pylance

To make pylance understand the python imports an extra path must be added to `.vscode/settings.json`:

```json
{
    "python.analysis.extraPaths": [
        "src/backend"
    ]
}
```

## Installing the docker on a Linux based server

Pull the latest docker image:

```text
sudo docker pull larspontoppidan/notesntodos:latest
```

Create a script for starting the docker

```text
sudo nano /usr/bin/start_notesntodos
```

Now paste the contents of `docker-run.sh` from this repository into the start script. Edit the `setup()` function and set the desired configuration values.

Test that the script can start up successfully:

```text
sudo chmod +x /usr/bin/start_notesntodos
sudo /usr/bin/start_notesntodos
```

At this point the Notes'n'Todos app should be available according to the configuration. Press `Ctrl-c` to stop it.

### Nginx reverse proxy with http authentication

Note'n'Todos doesn't currently have login management. The way to restrict access is currently to setup http authentication.

Running the following one-liner as root asks for username and password and stores the digest as `/etc/notesntodos.htpasswd`

```text
sudo su
printf "`read -p Username:\ ; echo $REPLY`:`openssl passwd -apr1`\n" >> /etc/notesntodos.htpasswd
exit
```

Example server block for nginx for serving on http. Adjust `server_name` and enter the correct port in the `proxy_pass` statement:

```text
server {
  server_name example.com;

  location /notes/ {
    proxy_pass http://localhost:5000;
    auth_basic            "Login";
    auth_basic_user_file  /etc/notesntodos.htpasswd;
  }

  # OBS! please enable HTTPS using your favorite method and remove the following listen 80:
  listen 80
}
```

### Automatic start using systemd

Using sudo edit the file: `/etc/systemd/system/notesntodos.service` and enter contents:

```text
[Unit]
After=network.target

[Service]
User=root
Group=root
ExecStart=/usr/bin/start_notesntodos

[Install]
WantedBy=multi-user.target
```

Check that starting, stopping and status for the service works without errors:

```text
sudo service notesntodos start
sudo service notesntodos status
sudo service notesntodos stop
sudo service notesntodos status
```

Then enable it for automatic start at boot:

```text
sudo service notesntodos enable
```

## Links

