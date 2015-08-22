FROM node:latest

ADD . /opt/boarder

WORKDIR /opt/boarder

RUN npm install

CMD ["node", "./app.js"]
