FROM node
COPY .* .
RUN npm install
EXPOSE  8081
CMD node server/server.js
