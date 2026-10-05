FROM docker.io/library/php:8.4.12-apache

WORKDIR /var/www/html

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite

EXPOSE 80