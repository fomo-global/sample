# Makefile с выбором compose-файла

OS := $(shell uname -s)

ifeq ($(OS),Darwin)
	COMPOSE_FILE = docker-compose.local.yml
else
	COMPOSE_FILE = docker-compose.prod.yml
endif

# FRONTEND
frontend-build:
	docker compose -f $(COMPOSE_FILE) build frontend

# BACKEND
backend-build:
	docker compose -f $(COMPOSE_FILE) build backend

# Сборка обоих
build:
	docker compose -f $(COMPOSE_FILE) build

# Запуск
up:
	docker compose -f $(COMPOSE_FILE) up -d

# Перезапуск
rebuild:
	docker compose -f $(COMPOSE_FILE) down
	docker compose -f $(COMPOSE_FILE) build
	docker compose -f $(COMPOSE_FILE) up -d

# Остановка
down:
	docker compose -f $(COMPOSE_FILE) down

# Логи
logs:
	docker compose -f $(COMPOSE_FILE) logs -f
