FROM node
ADD . /node
WORKDIR /node
RUN npm install
EXPOSE  8081
CMD node /node/server/server.js
