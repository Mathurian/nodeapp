#!/bin/bash
# Check Status of All Servers
# Usage: ./scripts/status.sh

echo "📊 ConMGR System Status"
echo "======================"
echo ""

# Check production (port 3000)
echo "Production Server (Port 3000):"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -ti :3000)
    UPTIME=$(ps -p $PID -o etime= | tr -d ' ')
    MEM=$(ps -p $PID -o rss= | awk '{printf "%.1f MB", $1/1024}')
    CPU=$(ps -p $PID -o %cpu= | tr -d ' ')
    echo "  ✅ RUNNING"
    echo "     PID: $PID"
    echo "     Uptime: $UPTIME"
    echo "     Memory: $MEM"
    echo "     CPU: $CPU%"
else
    echo "  ❌ NOT RUNNING"
fi

echo ""

# Check development backend (port 3001)
echo "Development Backend (Port 3001):"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -ti :3001)
    UPTIME=$(ps -p $PID -o etime= | tr -d ' ')
    MEM=$(ps -p $PID -o rss= | awk '{printf "%.1f MB", $1/1024}')
    echo "  ✅ RUNNING"
    echo "     PID: $PID"
    echo "     Uptime: $UPTIME"
    echo "     Memory: $MEM"
else
    echo "  ❌ NOT RUNNING"
fi

echo ""

# Check development frontend (port 3002)
echo "Development Frontend (Port 3002):"
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -ti :3002)
    UPTIME=$(ps -p $PID -o etime= | tr -d ' ')
    MEM=$(ps -p $PID -o rss= | awk '{printf "%.1f MB", $1/1024}')
    echo "  ✅ RUNNING"
    echo "     PID: $PID"
    echo "     Uptime: $UPTIME"
    echo "     Memory: $MEM"
else
    echo "  ❌ NOT RUNNING"
fi

echo ""

# Check Nginx
echo "Nginx:"
if systemctl is-active --quiet nginx; then
    echo "  ✅ RUNNING"
    WORKERS=$(pgrep -c nginx || echo "0")
    echo "     Workers: $WORKERS"
else
    echo "  ❌ NOT RUNNING"
fi

echo ""

# Check PostgreSQL
echo "PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    echo "  ✅ RUNNING"

    # Check databases
    if command -v psql >/dev/null 2>&1; then
        echo ""
        echo "  Databases:"
        PROD_USERS=$(PGPASSWORD=dittibop psql -U event_manager -h localhost -d event_manager -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "N/A")
        TEST_USERS=$(PGPASSWORD=dittibop psql -U event_manager -h localhost -d event_manager_test -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "N/A")
        echo "    Production (event_manager): $PROD_USERS users"
        echo "    Test (event_manager_test): $TEST_USERS users"
    fi
else
    echo "  ❌ NOT RUNNING"
fi

echo ""

# Check Redis
echo "Redis:"
if systemctl is-active --quiet redis-server 2>/dev/null || systemctl is-active --quiet redis 2>/dev/null; then
    echo "  ✅ RUNNING"
else
    echo "  ❌ NOT RUNNING"
fi

echo ""
echo "======================"
echo "Quick Actions:"
echo "  Start production:   ./scripts/start-production.sh"
echo "  Stop production:    ./scripts/stop-production.sh"
echo "  Start development:  ./scripts/start-development.sh"
echo "  Stop development:   ./scripts/stop-development.sh"
echo "  Run tests:          ./scripts/run-tests.sh"
