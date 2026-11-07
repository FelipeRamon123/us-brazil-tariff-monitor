@echo off
cd /d "%~dp0"
start "US-Brazil Tariff Monitor" http://127.0.0.1:8000
python serve.py

