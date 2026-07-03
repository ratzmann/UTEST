# Imagem base leve do Node.js 20
FROM node:20-alpine
WORKDIR /app

# Copia primeiro só o package.json para aproveitar cache do Docker
# (só reinstala dependências se o package.json mudar)
COPY package.json .
RUN npm install --omit=dev

# Copia o restante do código
COPY src ./src

EXPOSE 8080
CMD ["node", "src/server.js"]
