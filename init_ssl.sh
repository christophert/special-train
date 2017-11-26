#!/bin/bash
openssl req -new -newkey rsa:2048 -nodes -out server.csr -keyout server.key
openssl req -x509 -sha256 -days 365 -key server.key -in server.csr -out server.crt
