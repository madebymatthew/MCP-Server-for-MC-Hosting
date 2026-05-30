This project is meant to create an mcp server that will facilitate the administrative tasks of running a Minecraft Server on the cloud.

PROBLEM:
I am running an Oracle cloud always-free tier instance that hosts a Minecraft server 24/7 for my friends and I to play on. But for me to actually manage
the server I have to SSH in, google the commands for tmux, enter the tmux session, run the commands, and then remember to detach from the session or else it'll
just kill the server. If we want to clear some lag by restarting the server, I'd also have to sit and wait for the server to first close, then start it again.
Not to mention managing backups is a total pain.

SOLUTION:
Create a lightweight MCP server that will run in the same oracle cloud instance.
Then connect my claude desktop to it and conveniently manage the server without any of the hassle!
