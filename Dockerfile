FROM node:12
WORKDIR /app
COPY ./app .
COPY wait-for-postgres.sh .
RUN npm i
RUN apt update -y
RUN apt install -y postgresql
EXPOSE $PORT
CMD sh wait-for-postgres.sh $DATABASE_URL npm start
