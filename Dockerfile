FROM node:latest

ADD . /opt/dockerboard

WORKDIR /opt/dockerboard

RUN npm install

CMD ["node app.js"]
