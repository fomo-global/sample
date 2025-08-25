# Local

##### 1) комбинированный подход 
* в корне проекта выполнить:
```bash
ngrok http 3000
```

* в папках frontend и backend создать `.env` в соответствии с `.env-sample` - P.S рекоменация backend PORT=5000

##### 2) если нужно поднять проект без  `ngrok` на https выполнить в корне 
```bash
mkdir -p ssl
```
и
```bash 
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \

-keyout ssl/localhost.key \

-out ssl/localhost.crt \

-subj "/CN=localhost" \

-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

- в папку ssl загрузятся самоподписанные сертификаты
##### ВАЖНО!!!
заменить содержимое файла `nginx.local.conf` на:
```nginx
events {
	worker_connections 1024;
}

http {
	server_tokens off;
	charset utf-8;

	# HTTP сервер для редиректа на HTTPS
	server {
		listen 80;
		server_name localhost;
		return 301 https://$host$request_uri;
	}
	
	# HTTPS сервер
	server {
		listen 443 ssl;
		server_name localhost;
	
		# Самоподписанные сертификаты для localhost
		ssl_certificate /etc/ssl/certs/localhost.crt;
		ssl_certificate_key /etc/ssl/private/localhost.key;
	
		location / {
			root /usr/share/nginx/html;
			index index.html index.htm;
			try_files $uri $uri/ /index.html;
		} 
		
		location /api {
			proxy_pass http://backend:5000;
			proxy_set_header Host $host;
			proxy_set_header X-Real-IP $remote_addr;
		}
	}
}
```

и обновить `docker-compose.local.yml` :
```docker
nginx:
	image: nginx:stable
		ports:
			- "80:80"
			- "443:443"
		volumes:
			- ./frontend/dist:/usr/share/nginx/html
			- ./nginx/nginx.local.conf:/etc/nginx/nginx.conf:ro
			- ./ssl:/etc/ssl/certs
			- ./ssl/localhost.key:/etc/ssl/private/localhost.key
		depends_on:
			- frontend
			- backend
		networks:
			- app-network
```


# Production
- заменить в файле `nginx.prod.conf` host на свой домен
- при первом запуске на сервере для генерации ssl сертификатов выполнится:
```docker
command: certonly --webroot -w /var/www/certbot --force-renewal --email вашEmail -d вашДоменС.ru --agree-tos
```
- после создания сертификатов закомментировать эту строку 

1️⃣ Создание файла на сервере  `.env` через:
```bash
touch .env
```

2️⃣ Редактирование файла через `nano`
```bash
nano .env
```
чтобы выйти Ctrl+X

3️⃣ Проверка содержимого
```bash
cat .env
```

ВАЖНО 
в `.env` файлах на сервере убедиться что поля имеют вид:
```env
FRONT_ORIGIN=https://ваш домен

API_BASE_URL=https://ваш домен
```









в докере есть основные пути для nginx
/usr/share/nginx/html — Папка для сайта по умолчанию
docker compose up -d nginx
docker compose run --rm certbot
docker compose logs nginx
ОБЩИЙ

