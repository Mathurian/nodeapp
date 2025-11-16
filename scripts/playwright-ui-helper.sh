#!/bin/bash
# Playwright UI Remote Access Helper
# This script helps you find your server IP and access Playwright UI remotely

echo "=== Playwright UI Remote Access Helper ==="
echo ""

# Find server IP addresses
echo "Server IP addresses:"
ip addr show | grep "inet " | grep -v "127.0.0.1" | while read line; do
    IP=$(echo "$line" | awk '{print $2}' | cut -d'/' -f1)
    echo "  - $IP"
done

echo ""
echo "When you run 'npm run test:e2e:ui:host', Playwright will show:"
echo "  Listening on http://0.0.0.0:PORT"
echo ""
echo "To access from your local machine:"
echo "  1. Note the PORT number from the Playwright output"
echo "  2. Replace 0.0.0.0 with one of the IP addresses above"
echo "  3. Open http://SERVER_IP:PORT in your browser"
echo ""
echo "Example:"
echo "  If Playwright shows: http://0.0.0.0:44597"
echo "  And your server IP is: 192.168.1.100"
echo "  Access: http://192.168.1.100:44597"
echo ""
echo "Troubleshooting:"
echo "  - Test connectivity: curl http://SERVER_IP:PORT"
echo "  - Check firewall: sudo ufw allow PORT/tcp"
echo "  - Check browser console (F12) for errors"

