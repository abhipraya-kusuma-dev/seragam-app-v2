# ============================
# Stage 1: Node for frontend
# ============================
FROM node:22-alpine as frontend

# Set working directory
WORKDIR /app

# Copy only package.json to leverage caching
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the code
COPY docker/env/.env.prod .env
COPY docker/env/.env.db .env.db
COPY docker/env/.env.dev .env.dev
COPY . .

# Build Tailwind / JS assets
RUN npm run build

# ============================
# Stage 2: PHP backend
# ============================
FROM php:8.2-fpm-alpine as backend

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl-dev \
    ffmpeg \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    oniguruma-dev \
    libzip-dev \
    postgresql-dev \
    icu-dev \
    zlib-dev \
    libxml2-dev \
    git \
    unzip \
    openssl-dev \
    supervisor \
    shadow \
    tzdata \
    make \
    g++ \
    autoconf \
    supervisor

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install \
    curl \
    fileinfo \
    gd \
    intl \
    mbstring \
    pdo_pgsql \
    pgsql \
    zip \
    opcache \
    pcntl

RUN echo "disable_functions =" > /usr/local/etc/php/conf.d/00-clear-disabled.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy Laravel code
COPY . .

# Copy built frontend assets from previous stage
COPY --from=frontend /app/public ./public
COPY --from=frontend /app/resources ./resources
COPY --from=frontend /app/node_modules ./node_modules

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader && \
    php artisan config:clear && \
    php artisan storage:link && \
    php artisan octane:install --server=swoole

# Install Laravel Octane Swoole extension
RUN pecl install swoole && \
    docker-php-ext-enable swoole

# Permissions
RUN chown -R www-data:www-data /var/www && chmod -R 755 /var/www

# Copy supervisor config
COPY docker/config/supervisor/ /etc/supervisor/conf.d/

# Make sure logs folder exists
RUN mkdir -p /var/log && touch /var/log/octane.out.log /var/log/queue.out.log /var/log/reverb.out.log

# CMD to run supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
