FROM node:12
WORKDIR /app
COPY ./app/node_modules .
COPY ./app/package.json .
COPY wait-for-postgres.sh .
RUN npm i
RUN apt update -y
RUN apt install -y postgresql

WORKDIR /app
COPY ./app .
EXPOSE $PORT
CMD sh wait-for-postgres.sh $DATABASE_URL npm start
