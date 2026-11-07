from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HOST, PORT = "127.0.0.1", 8000
print(f"Dashboard: http://{HOST}:{PORT}")
ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler).serve_forever()

