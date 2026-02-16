from datetime import datetime

def log_error(msg):
    try:
        with open("server_debug.log", "a") as f:
            f.write(str(datetime.now()) + " " + str(msg) + "\n")
    except Exception:
        pass
