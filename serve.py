#!/usr/bin/env python

import sys
if sys.version_info[0] == 3: # python3
	from http.server import HTTPServer, CGIHTTPRequestHandler
else: # python2
	from BaseHTTPServer import HTTPServer
	from CGIHTTPServer import CGIHTTPRequestHandler
import cgitb; cgitb.enable()  ## This line enables CGI error reporting

if len(sys.argv) > 1:
	port = int(sys.argv[1])
else:
	port = 8000

server = HTTPServer
handler = CGIHTTPRequestHandler
server_address = ("", port)
handler.cgi_directories = ["/cgi-bin"]
httpd = server(server_address, handler)

if port == 4443:
	import ssl
	httpd.socket = ssl.wrap_socket(httpd.socket, keyfile='localhost.pem', certfile="localhost.pem", server_side=True)

httpd.serve_forever()
