#!/bin/bash

###############################################################################
# Native Service Installation Script (Linux/macOS)
# Installs Redis, ClamAV, and PostgreSQL without Docker
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}===================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

###############################################################################
# OS Detection
###############################################################################

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
            OS_VERSION=$VERSION_ID
        else
            print_error "Cannot detect Linux distribution"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        OS_VERSION=$(sw_vers -productVersion)
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi

    print_info "Detected OS: $OS $OS_VERSION"
}

###############################################################################
# Service Installation Functions
###############################################################################

install_redis_ubuntu() {
    print_header "Installing Redis on Ubuntu/Debian"

    sudo apt-get update
    sudo apt-get install -y redis-server

    # Enable and start Redis
    sudo systemctl enable redis-server
    sudo systemctl start redis-server

    print_success "Redis installed and started"
}

install_redis_fedora() {
    print_header "Installing Redis on Fedora/RHEL/CentOS"

    sudo dnf install -y redis

    # Enable and start Redis
    sudo systemctl enable redis
    sudo systemctl start redis

    print_success "Redis installed and started"
}

install_redis_macos() {
    print_header "Installing Redis on macOS"

    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first:"
        print_info "Visit: https://brew.sh"
        exit 1
    fi

    brew install redis

    # Start Redis
    brew services start redis

    print_success "Redis installed and started"
}

install_clamav_ubuntu() {
    print_header "Installing ClamAV on Ubuntu/Debian"

    sudo apt-get update
    sudo apt-get install -y clamav clamav-daemon clamav-freshclam

    # Stop the service to update virus definitions
    sudo systemctl stop clamav-freshclam

    print_info "Updating virus definitions (this may take a while)..."
    sudo freshclam

    # Enable and start services
    sudo systemctl enable clamav-daemon
    sudo systemctl enable clamav-freshclam
    sudo systemctl start clamav-freshclam
    sudo systemctl start clamav-daemon

    print_success "ClamAV installed and started"
    print_info "ClamAV socket: /var/run/clamav/clamd.ctl"
}

install_clamav_fedora() {
    print_header "Installing ClamAV on Fedora/RHEL/CentOS"

    sudo dnf install -y clamav clamav-update clamd

    # Update virus definitions
    print_info "Updating virus definitions (this may take a while)..."
    sudo freshclam

    # Enable and start services
    sudo systemctl enable clamd@scan
    sudo systemctl start clamd@scan

    print_success "ClamAV installed and started"
    print_info "ClamAV socket: /var/run/clamd.scan/clamd.sock"
}

install_clamav_macos() {
    print_header "Installing ClamAV on macOS"

    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first:"
        print_info "Visit: https://brew.sh"
        exit 1
    fi

    brew install clamav

    # Copy sample config files
    if [ ! -f /usr/local/etc/clamav/freshclam.conf ]; then
        cp /usr/local/etc/clamav/freshclam.conf.sample /usr/local/etc/clamav/freshclam.conf
        sed -i '' 's/^Example/#Example/' /usr/local/etc/clamav/freshclam.conf
    fi

    if [ ! -f /usr/local/etc/clamav/clamd.conf ]; then
        cp /usr/local/etc/clamav/clamd.conf.sample /usr/local/etc/clamav/clamd.conf
        sed -i '' 's/^Example/#Example/' /usr/local/etc/clamav/clamd.conf
    fi

    # Update virus definitions
    print_info "Updating virus definitions (this may take a while)..."
    freshclam

    # Start ClamAV daemon
    brew services start clamav

    print_success "ClamAV installed and started"
    print_info "ClamAV socket: /tmp/clamd.socket"
}

install_postgresql_ubuntu() {
    print_header "Installing PostgreSQL on Ubuntu/Debian"

    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib

    # Enable and start PostgreSQL
    sudo systemctl enable postgresql
    sudo systemctl start postgresql

    print_success "PostgreSQL installed and started"
}

install_postgresql_fedora() {
    print_header "Installing PostgreSQL on Fedora/RHEL/CentOS"

    sudo dnf install -y postgresql-server postgresql-contrib

    # Initialize database
    sudo postgresql-setup --initdb

    # Enable and start PostgreSQL
    sudo systemctl enable postgresql
    sudo systemctl start postgresql

    print_success "PostgreSQL installed and started"
}

install_postgresql_macos() {
    print_header "Installing PostgreSQL on macOS"

    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first:"
        print_info "Visit: https://brew.sh"
        exit 1
    fi

    brew install postgresql@15

    # Start PostgreSQL
    brew services start postgresql@15

    print_success "PostgreSQL installed and started"
}

###############################################################################
# Database Setup
###############################################################################

setup_database() {
    print_header "Setting up PostgreSQL Database"

    # Check if database exists
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='event_manager'" 2>/dev/null || echo "")

    if [ "$DB_EXISTS" = "1" ]; then
        print_warning "Database 'event_manager' already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo -u postgres psql -c "DROP DATABASE event_manager;"
            sudo -u postgres psql -c "DROP USER IF EXISTS event_manager;"
            print_info "Dropped existing database and user"
        else
            print_info "Keeping existing database"
            return
        fi
    fi

    # Create user and database
    print_info "Creating database user and database..."

    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    sudo -u postgres psql <<EOF
CREATE USER event_manager WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
EOF

    print_success "Database created successfully"
    print_info "Database: event_manager"
    print_info "User: event_manager"
    print_info "Password: $DB_PASSWORD"
    print_warning "Please save this password securely!"

    # Update .env file
    update_env_file "$DB_PASSWORD"
}

setup_database_macos() {
    print_header "Setting up PostgreSQL Database (macOS)"

    # Check if database exists
    DB_EXISTS=$(psql -U $(whoami) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='event_manager'" 2>/dev/null || echo "")

    if [ "$DB_EXISTS" = "1" ]; then
        print_warning "Database 'event_manager' already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            psql -U $(whoami) -d postgres -c "DROP DATABASE event_manager;"
            psql -U $(whoami) -d postgres -c "DROP USER IF EXISTS event_manager;"
            print_info "Dropped existing database and user"
        else
            print_info "Keeping existing database"
            return
        fi
    fi

    # Create user and database
    print_info "Creating database user and database..."

    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    psql -U $(whoami) -d postgres <<EOF
CREATE USER event_manager WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
EOF

    print_success "Database created successfully"
    print_info "Database: event_manager"
    print_info "User: event_manager"
    print_info "Password: $DB_PASSWORD"
    print_warning "Please save this password securely!"

    # Update .env file
    update_env_file "$DB_PASSWORD"
}

###############################################################################
# Environment Configuration
###############################################################################

update_env_file() {
    local db_password=$1
    local env_file="$PROJECT_ROOT/.env"

    print_header "Updating .env Configuration"

    # Detect ClamAV socket path
    local clamav_socket=""
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        clamav_socket="/var/run/clamav/clamd.ctl"
    elif [ "$OS" = "fedora" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        clamav_socket="/var/run/clamd.scan/clamd.sock"
    elif [ "$OS" = "macos" ]; then
        clamav_socket="/tmp/clamd.socket"
    fi

    # Update or add environment variables
    if [ -f "$env_file" ]; then
        # Redis configuration
        if grep -q "^REDIS_ENABLED=" "$env_file"; then
            sed -i.bak "s|^REDIS_ENABLED=.*|REDIS_ENABLED=true|" "$env_file"
        else
            echo "REDIS_ENABLED=true" >> "$env_file"
        fi

        if grep -q "^REDIS_HOST=" "$env_file"; then
            sed -i.bak "s|^REDIS_HOST=.*|REDIS_HOST=localhost|" "$env_file"
        else
            echo "REDIS_HOST=localhost" >> "$env_file"
        fi

        if grep -q "^REDIS_PORT=" "$env_file"; then
            sed -i.bak "s|^REDIS_PORT=.*|REDIS_PORT=6379|" "$env_file"
        else
            echo "REDIS_PORT=6379" >> "$env_file"
        fi

        # ClamAV configuration
        if grep -q "^CLAMAV_ENABLED=" "$env_file"; then
            sed -i.bak "s|^CLAMAV_ENABLED=.*|CLAMAV_ENABLED=true|" "$env_file"
        else
            echo "CLAMAV_ENABLED=true" >> "$env_file"
        fi

        if [ -n "$clamav_socket" ]; then
            if grep -q "^CLAMAV_SOCKET=" "$env_file"; then
                sed -i.bak "s|^CLAMAV_SOCKET=.*|CLAMAV_SOCKET=$clamav_socket|" "$env_file"
            else
                echo "CLAMAV_SOCKET=$clamav_socket" >> "$env_file"
            fi
        fi

        # PostgreSQL configuration
        if grep -q "^DATABASE_URL=" "$env_file"; then
            sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"postgresql://event_manager:$db_password@localhost:5432/event_manager?schema=public&connection_limit=10&pool_timeout=10&connect_timeout=5\"|" "$env_file"
        else
            echo "DATABASE_URL=\"postgresql://event_manager:$db_password@localhost:5432/event_manager?schema=public&connection_limit=10&pool_timeout=10&connect_timeout=5\"" >> "$env_file"
        fi

        # Remove backup file
        rm -f "$env_file.bak"

        print_success "Environment file updated"
    else
        print_error "Environment file not found: $env_file"
    fi
}

###############################################################################
# Service Verification
###############################################################################

verify_redis() {
    print_header "Verifying Redis Installation"

    if redis-cli ping &> /dev/null; then
        print_success "Redis is running and responding"
        redis-cli info server | grep "redis_version"
    else
        print_error "Redis is not responding"
        return 1
    fi
}

verify_clamav() {
    print_header "Verifying ClamAV Installation"

    if clamdscan --version &> /dev/null; then
        print_success "ClamAV is installed"
        clamdscan --version

        # Check if daemon is running
        if systemctl is-active --quiet clamav-daemon 2>/dev/null || \
           systemctl is-active --quiet clamd@scan 2>/dev/null || \
           pgrep clamd &> /dev/null; then
            print_success "ClamAV daemon is running"
        else
            print_warning "ClamAV daemon may not be running"
        fi
    else
        print_error "ClamAV is not installed properly"
        return 1
    fi
}

verify_postgresql() {
    print_header "Verifying PostgreSQL Installation"

    if command -v psql &> /dev/null; then
        print_success "PostgreSQL is installed"
        psql --version

        # Check if service is running
        if systemctl is-active --quiet postgresql 2>/dev/null || \
           pgrep postgres &> /dev/null; then
            print_success "PostgreSQL is running"
        else
            print_error "PostgreSQL is not running"
            return 1
        fi
    else
        print_error "PostgreSQL is not installed properly"
        return 1
    fi
}

###############################################################################
# Main Installation Flow
###############################################################################

main() {
    print_header "Event Manager - Native Service Installation"

    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        print_info "The script will use sudo when necessary"
        exit 1
    fi

    # Detect operating system
    detect_os

    # Ask which services to install
    echo ""
    print_info "Which services would you like to install?"
    echo "1) All services (Redis, ClamAV, PostgreSQL)"
    echo "2) Redis only"
    echo "3) ClamAV only"
    echo "4) PostgreSQL only"
    echo "5) Custom selection"
    read -p "Select option (1-5): " -n 1 -r INSTALL_OPTION
    echo ""

    INSTALL_REDIS=false
    INSTALL_CLAMAV=false
    INSTALL_POSTGRESQL=false

    case $INSTALL_OPTION in
        1)
            INSTALL_REDIS=true
            INSTALL_CLAMAV=true
            INSTALL_POSTGRESQL=true
            ;;
        2)
            INSTALL_REDIS=true
            ;;
        3)
            INSTALL_CLAMAV=true
            ;;
        4)
            INSTALL_POSTGRESQL=true
            ;;
        5)
            read -p "Install Redis? (y/N): " -n 1 -r
            echo
            [[ $REPLY =~ ^[Yy]$ ]] && INSTALL_REDIS=true

            read -p "Install ClamAV? (y/N): " -n 1 -r
            echo
            [[ $REPLY =~ ^[Yy]$ ]] && INSTALL_CLAMAV=true

            read -p "Install PostgreSQL? (y/N): " -n 1 -r
            echo
            [[ $REPLY =~ ^[Yy]$ ]] && INSTALL_POSTGRESQL=true
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac

    # Install services based on OS
    if [ "$INSTALL_REDIS" = true ]; then
        case $OS in
            ubuntu|debian)
                install_redis_ubuntu
                ;;
            fedora|rhel|centos)
                install_redis_fedora
                ;;
            macos)
                install_redis_macos
                ;;
            *)
                print_error "Unsupported OS for Redis installation: $OS"
                ;;
        esac
    fi

    if [ "$INSTALL_CLAMAV" = true ]; then
        case $OS in
            ubuntu|debian)
                install_clamav_ubuntu
                ;;
            fedora|rhel|centos)
                install_clamav_fedora
                ;;
            macos)
                install_clamav_macos
                ;;
            *)
                print_error "Unsupported OS for ClamAV installation: $OS"
                ;;
        esac
    fi

    if [ "$INSTALL_POSTGRESQL" = true ]; then
        case $OS in
            ubuntu|debian)
                install_postgresql_ubuntu
                ;;
            fedora|rhel|centos)
                install_postgresql_fedora
                ;;
            macos)
                install_postgresql_macos
                ;;
            *)
                print_error "Unsupported OS for PostgreSQL installation: $OS"
                ;;
        esac

        # Setup database
        if [ "$OS" = "macos" ]; then
            setup_database_macos
        else
            setup_database
        fi
    fi

    # Verify installations
    echo ""
    print_header "Verifying Installations"

    [ "$INSTALL_REDIS" = true ] && verify_redis
    [ "$INSTALL_CLAMAV" = true ] && verify_clamav
    [ "$INSTALL_POSTGRESQL" = true ] && verify_postgresql

    # Final summary
    print_header "Installation Complete!"

    if [ "$INSTALL_REDIS" = true ]; then
        print_success "Redis: localhost:6379"
    fi

    if [ "$INSTALL_CLAMAV" = true ]; then
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            print_success "ClamAV: /var/run/clamav/clamd.ctl"
        elif [ "$OS" = "fedora" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
            print_success "ClamAV: /var/run/clamd.scan/clamd.sock"
        elif [ "$OS" = "macos" ]; then
            print_success "ClamAV: /tmp/clamd.socket"
        fi
    fi

    if [ "$INSTALL_POSTGRESQL" = true ]; then
        print_success "PostgreSQL: localhost:5432"
    fi

    echo ""
    print_info "Next steps:"
    echo "  1. Review and update the .env file if needed"
    echo "  2. Run database migrations: npm run migrate"
    echo "  3. Start the application: npm start"
    echo ""
}

# Run main function
main "$@"
